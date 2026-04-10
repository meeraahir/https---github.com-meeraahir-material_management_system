from io import BytesIO

from django.db.models import Sum, F, FloatField
from django.http import HttpResponse
from core.pdf_utils import build_pdf_response
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from openpyxl import Workbook

from sites.permissions import IsAdminOrReadOnly
from .models import Vendor, VendorTransaction, VendorPayment
from .serializers import VendorPaymentSerializer, VendorSerializer, VendorTransactionSerializer


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all().order_by('id')
    serializer_class = VendorSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name']
    search_fields = ['name', 'phone', 'address']

    def _date_range(self):
        return self.request.query_params.get('date_from'), self.request.query_params.get('date_to')

    @action(detail=True, methods=['get'], url_path='ledger')
    def ledger(self, request, pk=None):
        vendor = self.get_object()
        purchases = VendorTransaction.objects.filter(vendor=vendor).select_related('site', 'material')
        payments = VendorPayment.objects.filter(vendor=vendor).select_related('purchase', 'site', 'purchase__material')

        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        if date_from:
            purchases = purchases.filter(date__gte=date_from)
            payments = payments.filter(date__gte=date_from)
        if date_to:
            purchases = purchases.filter(date__lte=date_to)
            payments = payments.filter(date__lte=date_to)

        entries = []
        for purchase in purchases:
            entries.append({
                'id': f'purchase-{purchase.id}',
                'entry_type': 'purchase',
                'reference': purchase.invoice_number or f'PUR-{purchase.id}',
                'description': purchase.description,
                'site': purchase.site.name,
                'material': purchase.material.name if purchase.material else None,
                'debit': purchase.total_amount,
                'credit': 0,
                'date': purchase.date,
                '_sort_id': purchase.id,
            })

        for payment in payments:
            entries.append({
                'id': f'payment-{payment.id}',
                'entry_type': 'payment',
                'reference': payment.reference_number or f'PAY-{payment.id}',
                'description': payment.remarks,
                'site': payment.site.name,
                'material': payment.purchase.material.name if payment.purchase and payment.purchase.material else None,
                'debit': 0,
                'credit': payment.amount,
                'date': payment.date,
                '_sort_id': payment.id,
            })

        entries.sort(key=lambda item: (item['date'], item['_sort_id'], item['entry_type']))
        running_balance = 0
        data = []
        for entry in entries:
            running_balance += entry['debit'] - entry['credit']
            data.append({
                'id': entry['id'],
                'entry_type': entry['entry_type'],
                'reference': entry['reference'],
                'description': entry['description'],
                'site': entry['site'],
                'material': entry['material'],
                'debit': entry['debit'],
                'credit': entry['credit'],
                'balance': running_balance,
                'date': entry['date'],
            })
        totals = {
            'total_amount': sum(item['debit'] for item in data),
            'paid_amount': sum(item['credit'] for item in data),
            'pending_amount': running_balance,
        }
        return Response({'vendor': vendor.name, 'transactions': data, 'totals': totals})

    @action(detail=True, methods=['get'], url_path='ledger/export')
    def export_ledger(self, request, pk=None):
        ledger_data = self.ledger(request, pk).data
        rows = ledger_data['transactions']
        return self._export_report(
            rows,
            f"vendor_{ledger_data['vendor']}_ledger",
            ['id', 'entry_type', 'reference', 'description', 'site', 'material', 'debit', 'credit', 'balance', 'date'],
        )

    @action(detail=True, methods=['get'], url_path='ledger/pdf')
    def export_ledger_pdf(self, request, pk=None):
        ledger_data = self.ledger(request, pk).data
        rows = ledger_data['transactions']
        return self._export_pdf(
            rows,
            f"vendor_{ledger_data['vendor']}_ledger",
            ['id', 'entry_type', 'reference', 'description', 'site', 'material', 'debit', 'credit', 'balance', 'date'],
        )

    @action(detail=False, methods=['get'], url_path='reports/pending')
    def pending_transactions(self, request):
        queryset = VendorTransaction.objects.filter(paid_amount__lt=F('total_amount'))
        date_from, date_to = self._date_range()
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        data = (
            queryset
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
        queryset = VendorTransaction.objects.all()
        date_from, date_to = self._date_range()
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        data = (
            queryset.values('vendor__id', 'vendor__name')
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

    @action(detail=False, methods=['get'], url_path='reports/site-wise')
    def site_wise_report(self, request):
        queryset = VendorTransaction.objects.all()
        date_from, date_to = self._date_range()
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        data = (
            queryset.values('site__id', 'site__name')
            .annotate(
                total_amount_sum=Sum('total_amount', output_field=FloatField()),
                paid_amount_sum=Sum('paid_amount', output_field=FloatField()),
                pending_amount_sum=(
                    Sum('total_amount', output_field=FloatField())
                    - Sum('paid_amount', output_field=FloatField())
                ),
            )
            .order_by('site__name')
        )
        return Response([
            {
                'site_id': item['site__id'],
                'site_name': item['site__name'],
                'total_amount': item['total_amount_sum'] or 0,
                'paid_amount': item['paid_amount_sum'] or 0,
                'pending_amount': item['pending_amount_sum'] or 0,
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)')
    def site_specific_report(self, request, site_id=None):
        queryset = VendorTransaction.objects.filter(site_id=site_id)
        date_from, date_to = self._date_range()
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        data = (
            queryset.values('vendor__id', 'vendor__name')
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

    @action(detail=False, methods=['get'], url_path='reports/site-wise/export')
    def export_site_wise_report(self, request):
        report_data = self.site_wise_report(request).data
        return self._export_report(report_data, 'vendor_site_wise_report', ['site_id', 'site_name', 'total_amount', 'paid_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)/export')
    def export_site_specific_report(self, request, site_id=None):
        report_data = self.site_specific_report(request, site_id).data
        return self._export_report(report_data, f'vendor_site_{site_id}_report', ['vendor_id', 'vendor_name', 'total_amount', 'paid_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path='reports/summary/pdf')
    def export_summary_pdf(self, request):
        report_data = self.summary_report(request).data
        return self._export_pdf(report_data, 'vendor_summary_report')

    @action(detail=False, methods=['get'], url_path='reports/site-wise/pdf')
    def export_site_wise_report_pdf(self, request):
        report_data = self.site_wise_report(request).data
        return self._export_pdf(report_data, 'vendor_site_wise_report')

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)/pdf')
    def export_site_specific_report_pdf(self, request, site_id=None):
        report_data = self.site_specific_report(request, site_id).data
        return self._export_pdf(report_data, f'vendor_site_{site_id}_report')

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
        return build_pdf_response(
            filename_base=filename_base,
            title=filename_base.replace('_', ' ').title(),
            rows=report_data,
            headers=headers,
        )


class VendorTransactionViewSet(viewsets.ModelViewSet):
    queryset = VendorTransaction.objects.select_related('vendor', 'material', 'site').all().order_by('id')
    serializer_class = VendorTransactionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['vendor', 'site', 'material', 'date']
    search_fields = ['vendor__name', 'site__name', 'material__name']
    ordering_fields = ['date', 'total_amount', 'paid_amount']
    ordering = ['-date']


class VendorPaymentViewSet(viewsets.ModelViewSet):
    queryset = VendorPayment.objects.select_related('purchase', 'vendor', 'site').all().order_by('-date', '-id')
    serializer_class = VendorPaymentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['purchase', 'vendor', 'site', 'date']
    search_fields = ['vendor__name', 'site__name', 'purchase__invoice_number', 'reference_number', 'remarks']
    ordering_fields = ['date', 'amount']
    ordering = ['-date']

    def perform_destroy(self, instance):
        purchase = instance.purchase
        instance.delete()
        purchase.refresh_paid_amount(save=True)
