from io import BytesIO

from django.db.models import Sum, F, FloatField
from django.http import HttpResponse
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from openpyxl import Workbook

from sites.permissions import IsAdminOrReadOnly
from .models import Vendor, VendorTransaction
from .serializers import VendorSerializer, VendorTransactionSerializer


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().order_by('id')
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name']
    search_fields = ['name', 'phone', 'address']

    @action(detail=True, methods=['get'], url_path='ledger')
    def ledger(self, request, pk=None):
        vendor = self.get_object()
        transactions = VendorTransaction.objects.filter(vendor=vendor).select_related('site', 'material')

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            transactions = transactions.filter(date__gte=date_from)
        if date_to:
            transactions = transactions.filter(date__lte=date_to)

        data = [
            {
                'id': tx.id,
                'invoice_number': tx.invoice_number,
                'description': tx.description,
                'site': tx.site.name,
                'material': tx.material.name if tx.material else None,
                'total_amount': tx.total_amount,
                'paid_amount': tx.paid_amount,
                'pending_amount': tx.pending_amount(),
                'date': tx.date,
            }
            for tx in transactions
        ]
        totals = {
            'total_amount': sum(tx['total_amount'] for tx in data),
            'paid_amount': sum(tx['paid_amount'] for tx in data),
            'pending_amount': sum(tx['pending_amount'] for tx in data),
        }
        return Response({'vendor': vendor.name, 'transactions': data, 'totals': totals})

    @action(detail=True, methods=['get'], url_path='ledger/export')
    def export_ledger(self, request, pk=None):
        ledger_data = self.ledger(request, pk).data
        rows = ledger_data['transactions']
        return self._export_report(
            rows,
            f"vendor_{ledger_data['vendor']}_ledger",
            ['id', 'invoice_number', 'description', 'site', 'material', 'total_amount', 'paid_amount', 'pending_amount', 'date'],
        )

    @action(detail=True, methods=['get'], url_path='ledger/pdf')
    def export_ledger_pdf(self, request, pk=None):
        ledger_data = self.ledger(request, pk).data
        rows = ledger_data['transactions']
        return self._export_pdf(
            rows,
            f"vendor_{ledger_data['vendor']}_ledger",
            ['id', 'invoice_number', 'description', 'site', 'material', 'total_amount', 'paid_amount', 'pending_amount', 'date'],
        )

    @action(detail=False, methods=['get'], url_path='reports/pending')
    def pending_transactions(self, request):
        data = (
            VendorTransaction.objects.filter(paid_amount__lt=F('total_amount'))
            .select_related('vendor', 'site', 'material')
            .values(
                'id',
                'vendor__name',
                'site__name',
                'material__name',
                'total_amount',
                'paid_amount',
                'date',
            )
        )
        return Response([
            {
                'id': item['id'],
                'vendor': item['vendor__name'],
                'site': item['site__name'],
                'material': item['material__name'],
                'total_amount': item['total_amount'],
                'paid_amount': item['paid_amount'],
                'pending_amount': item['total_amount'] - item['paid_amount'],
                'date': item['date'],
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/pending/export')
    def export_pending(self, request):
        pending_data = self.pending_transactions(request).data
        return self._export_report(pending_data, 'vendor_pending_transactions', ['id', 'vendor', 'site', 'material', 'total_amount', 'paid_amount', 'pending_amount', 'date'])

    @action(detail=False, methods=['get'], url_path='reports/pending/pdf')
    def export_pending_pdf(self, request):
        pending_data = self.pending_transactions(request).data
        return self._export_pdf(pending_data, 'vendor_pending_transactions')

    @action(detail=False, methods=['get'], url_path='reports/summary')
    def summary_report(self, request):
        data = (
            VendorTransaction.objects.values('vendor__id', 'vendor__name')
            .annotate(
                total_amount_sum=Sum('total_amount', output_field=FloatField()),
                paid_amount_sum=Sum('paid_amount', output_field=FloatField()),
                pending_amount_sum=(
                    Sum('total_amount', output_field=FloatField())
                    - Sum('paid_amount', output_field=FloatField())
                ),
            )
            .order_by('vendor__name')
        )
        return Response([
            {
                'vendor_id': item['vendor__id'],
                'vendor_name': item['vendor__name'],
                'total_amount': item['total_amount_sum'] or 0,
                'paid_amount': item['paid_amount_sum'] or 0,
                'pending_amount': item['pending_amount_sum'] or 0,
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/summary/export')
    def export_summary(self, request):
        report_data = self.summary_report(request).data
        return self._export_report(report_data, 'vendor_summary_report', ['vendor_id', 'vendor_name', 'total_amount', 'paid_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path='reports/summary/pdf')
    def export_summary_pdf(self, request):
        report_data = self.summary_report(request).data
        return self._export_pdf(report_data, 'vendor_summary_report')

    @action(detail=False, methods=['get'], url_path='chart/summary')
    def chart_summary(self, request):
        return self.summary_report(request)

    @action(detail=False, methods=['get'], url_path='chart/pending')
    def chart_pending(self, request):
        return self.pending_transactions(request)

    def _export_report(self, report_data, filename_base, headers=None):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = filename_base[:31]

        if report_data:
            if headers is None:
                headers = list(report_data[0].keys())
            sheet.append(headers)
            for row in report_data:
                sheet.append([row.get(key, '') for key in headers])
        else:
            sheet.append(['No data available'])

        output = BytesIO()
        workbook.save(output)
        output.seek(0)

        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename_base}.xlsx"'
        return response

    def _export_pdf(self, report_data, filename_base, headers=None):
        if not headers and report_data:
            headers = list(report_data[0].keys())

        output = BytesIO()
        canvas = Canvas(output, pagesize=letter)
        width, height = letter
        y = height - inch

        canvas.setFont('Helvetica-Bold', 12)
        canvas.drawString(inch, y, filename_base.replace('_', ' ').title())
        y -= 0.5 * inch
        canvas.setFont('Helvetica', 10)

        if report_data:
            if headers:
                canvas.drawString(inch, y, ' | '.join(headers))
                y -= 0.3 * inch
            for row in report_data:
                if y < inch:
                    canvas.showPage()
                    canvas.setFont('Helvetica', 10)
                    y = height - inch
                line = ' | '.join(str(row.get(key, '')) for key in headers)
                canvas.drawString(inch, y, line)
                y -= 0.25 * inch
        else:
            canvas.drawString(inch, y, 'No data available')

        canvas.save()
        output.seek(0)
        response = HttpResponse(output.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename_base}.pdf"'
        return response


class VendorTransactionViewSet(viewsets.ModelViewSet):
    queryset = VendorTransaction.objects.select_related('vendor', 'material', 'site').all().order_by('id')
    serializer_class = VendorTransactionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['vendor', 'site', 'material', 'date']
    search_fields = ['vendor__name', 'site__name', 'material__name']
    ordering_fields = ['date', 'total_amount', 'paid_amount']
    ordering = ['-date']
