from io import BytesIO

from django.db.models import Sum, F, FloatField, Q
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
from .models import Party, Transaction
from .serializers import PartySerializer, TransactionSerializer


class PartyViewSet(viewsets.ModelViewSet):
    queryset = Party.objects.all().order_by('id')
    serializer_class = PartySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name']
    search_fields = ['name', 'contact']

    @action(detail=True, methods=['get'], url_path='ledger')
    def ledger(self, request, pk=None):
        party = self.get_object()
        transactions = Transaction.objects.filter(party=party).select_related('site')
        data = [
            {
                'id': tx.id,
                'site': tx.site.name,
                'amount': tx.amount,
                'received': tx.received,
                'date': tx.date,
            }
            for tx in transactions
        ]
        totals = {
            'total_amount': sum(tx['amount'] for tx in data),
            'received_amount': sum(tx['amount'] for tx in data if tx['received']),
            'pending_amount': sum(tx['amount'] for tx in data if not tx['received']),
        }
        return Response({'party': party.name, 'transactions': data, 'totals': totals})

    @action(detail=True, methods=['get'], url_path='ledger/export')
    def export_ledger(self, request, pk=None):
        ledger_data = self.ledger(request, pk).data
        rows = ledger_data['transactions']
        return self._export_report(rows, f"party_{ledger_data['party']}_ledger", ['id', 'site', 'amount', 'received', 'date'])

    @action(detail=True, methods=['get'], url_path='ledger/pdf')
    def export_ledger_pdf(self, request, pk=None):
        ledger_data = self.ledger(request, pk).data
        rows = ledger_data['transactions']
        return self._export_pdf(rows, f"party_{ledger_data['party']}_ledger")

    @action(detail=False, methods=['get'], url_path='reports/receivables')
    def receivables_report(self, request):
        data = (
            Transaction.objects.values('party__id', 'party__name')
            .annotate(
                total_amount=Sum('amount', output_field=FloatField()),
                received_amount=Sum('amount', filter=Q(received=True), output_field=FloatField()),
                pending_amount=Sum('amount', filter=Q(received=False), output_field=FloatField()),
            )
            .order_by('party__name')
        )
        report = []
        for item in data:
            report.append({
                'party_id': item['party__id'],
                'party_name': item['party__name'],
                'total_amount': item['total_amount'] or 0,
                'received_amount': item['received_amount'] or 0,
                'pending_amount': item['pending_amount'] or 0,
            })
        return Response(report)

    @action(detail=False, methods=['get'], url_path='reports/receivables/export')
    def export_receivables_report(self, request):
        report_data = self.receivables_report(request).data
        return self._export_report(report_data, 'finance_receivables_report', ['party_id', 'party_name', 'total_amount', 'received_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path='reports/receivables/pdf')
    def export_receivables_report_pdf(self, request):
        report_data = self.receivables_report(request).data
        return self._export_pdf(report_data, 'finance_receivables_report')

    @action(detail=False, methods=['get'], url_path='chart/receivables')
    def chart_receivables(self, request):
        return self.receivables_report(request)

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


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related('party', 'site').all().order_by('id')
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['party', 'site', 'received']
    search_fields = ['party__name', 'site__name']
