from io import BytesIO

from django.db.models import Sum, F, FloatField, Q
from django.http import HttpResponse
from core.pdf_utils import build_pdf_response
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from openpyxl import Workbook

from sites.permissions import IsAdminOrReadOnly
from .models import ClientReceipt, MiscellaneousExpense, OwnerPayout, Party, Transaction
from .serializers import (
    MiscellaneousExpenseSerializer,
    OwnerPayoutSerializer,
    PartySerializer,
    TransactionSerializer,
)
from .utils import normalize_receipt_style_invoices


class PartyViewSet(viewsets.ModelViewSet):
    queryset = Party.objects.all().order_by('id')
    serializer_class = PartySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name']
    search_fields = ['name', 'contact']

    def _date_range(self):
        return self.request.query_params.get('date_from'), self.request.query_params.get('date_to')

    @action(detail=True, methods=['get'], url_path='ledger')
    def ledger(self, request, pk=None):
        party = self.get_object()
        normalize_receipt_style_invoices(party=party)
        invoices = Transaction.objects.filter(party=party).select_related('site')
        receipts = ClientReceipt.objects.filter(party=party).select_related('site', 'invoice')
        date_from, date_to = self._date_range()

        if date_from:
            invoices = invoices.filter(date__gte=date_from)
            receipts = receipts.filter(date__gte=date_from)
        if date_to:
            invoices = invoices.filter(date__lte=date_to)
            receipts = receipts.filter(date__lte=date_to)

        entries = []
        for invoice in invoices:
            entries.append({
                'id': f'invoice-{invoice.id}',
                'entry_type': 'invoice',
                'site': invoice.site.name,
                'debit': invoice.amount,
                'credit': 0,
                'date': invoice.date,
                '_sort_id': invoice.id,
                '_sort_priority': 0,
            })

        for receipt in receipts:
            entries.append({
                'id': f'receipt-{receipt.id}',
                'entry_type': 'receipt',
                'site': receipt.site.name,
                'debit': 0,
                'credit': receipt.amount,
                'date': receipt.date,
                '_sort_id': receipt.id,
                '_sort_priority': 1,
            })

        entries.sort(key=lambda item: (item['date'], item['_sort_priority'], item['_sort_id']))
        running_balance = 0
        data = []
        for entry in entries:
            running_balance += entry['debit'] - entry['credit']
            data.append({
                'id': entry['id'],
                'entry_type': entry['entry_type'],
                'site': entry['site'],
                'debit': entry['debit'],
                'credit': entry['credit'],
                'balance': running_balance,
                'date': entry['date'],
            })
        totals = {
            'total_amount': sum(item['debit'] for item in data),
            'received_amount': sum(item['credit'] for item in data),
            'pending_amount': running_balance,
        }
        return Response({'party': party.name, 'transactions': data, 'totals': totals})

    @action(detail=True, methods=['get'], url_path='ledger/export')
    def export_ledger(self, request, pk=None):
        ledger_data = self.ledger(request, pk).data
        rows = ledger_data['transactions']
        return self._export_report(rows, f"party_{ledger_data['party']}_ledger", ['id', 'entry_type', 'site', 'debit', 'credit', 'balance', 'date'])

    @action(detail=True, methods=['get'], url_path='ledger/pdf')
    def export_ledger_pdf(self, request, pk=None):
        ledger_data = self.ledger(request, pk).data
        rows = ledger_data['transactions']
        return self._export_pdf(rows, f"party_{ledger_data['party']}_ledger")

    @action(detail=False, methods=['get'], url_path='reports/receivables')
    def receivables_report(self, request):
        report = []
        invoices = Transaction.objects.all()
        receipts = ClientReceipt.objects.all()
        date_from, date_to = self._date_range()

        if date_from:
            invoices = invoices.filter(date__gte=date_from)
            receipts = receipts.filter(date__gte=date_from)
        if date_to:
            invoices = invoices.filter(date__lte=date_to)
            receipts = receipts.filter(date__lte=date_to)

        invoice_data = (
            invoices.values('party__id', 'party__name')
            .annotate(total_amount=Sum('amount', output_field=FloatField()))
            .order_by('party__name')
        )
        receipt_map = {
            item['party__id']: item['received_amount'] or 0
            for item in receipts.values('party__id').annotate(received_amount=Sum('amount', output_field=FloatField()))
        }
        for item in invoice_data:
            received_amount = receipt_map.get(item['party__id'], 0)
            report.append({
                'party_id': item['party__id'],
                'party_name': item['party__name'],
                'total_amount': item['total_amount'] or 0,
                'received_amount': received_amount,
                'pending_amount': (item['total_amount'] or 0) - received_amount,
            })
        return Response(report)

    @action(detail=False, methods=['get'], url_path='reports/site-wise')
    def site_wise_report(self, request):
        report = []
        invoices = Transaction.objects.all()
        receipts = ClientReceipt.objects.all()
        date_from, date_to = self._date_range()

        if date_from:
            invoices = invoices.filter(date__gte=date_from)
            receipts = receipts.filter(date__gte=date_from)
        if date_to:
            invoices = invoices.filter(date__lte=date_to)
            receipts = receipts.filter(date__lte=date_to)

        invoice_data = (
            invoices.values('site__id', 'site__name')
            .annotate(total_amount=Sum('amount', output_field=FloatField()))
            .order_by('site__name')
        )
        receipt_map = {
            item['site__id']: item['received_amount'] or 0
            for item in receipts.values('site__id').annotate(received_amount=Sum('amount', output_field=FloatField()))
        }
        for item in invoice_data:
            received_amount = receipt_map.get(item['site__id'], 0)
            report.append({
                'site_id': item['site__id'],
                'site_name': item['site__name'],
                'total_amount': item['total_amount'] or 0,
                'received_amount': received_amount,
                'pending_amount': (item['total_amount'] or 0) - received_amount,
            })
        return Response(report)

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)')
    def site_specific_report(self, request, site_id=None):
        report = []
        invoices = Transaction.objects.filter(site_id=site_id)
        receipts = ClientReceipt.objects.filter(site_id=site_id)
        date_from, date_to = self._date_range()

        if date_from:
            invoices = invoices.filter(date__gte=date_from)
            receipts = receipts.filter(date__gte=date_from)
        if date_to:
            invoices = invoices.filter(date__lte=date_to)
            receipts = receipts.filter(date__lte=date_to)

        invoice_data = (
            invoices.values('party__id', 'party__name')
            .annotate(total_amount=Sum('amount', output_field=FloatField()))
            .order_by('party__name')
        )
        receipt_map = {
            item['party__id']: item['received_amount'] or 0
            for item in receipts.values('party__id').annotate(received_amount=Sum('amount', output_field=FloatField()))
        }
        for item in invoice_data:
            received_amount = receipt_map.get(item['party__id'], 0)
            report.append({
                'party_id': item['party__id'],
                'party_name': item['party__name'],
                'total_amount': item['total_amount'] or 0,
                'received_amount': received_amount,
                'pending_amount': (item['total_amount'] or 0) - received_amount,
            })
        return Response(report)

    @action(detail=False, methods=['get'], url_path='reports/receivables/export')
    def export_receivables_report(self, request):
        report_data = self.receivables_report(request).data
        return self._export_report(report_data, 'finance_receivables_report', ['party_id', 'party_name', 'total_amount', 'received_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path='reports/site-wise/export')
    def export_site_wise_report(self, request):
        report_data = self.site_wise_report(request).data
        return self._export_report(report_data, 'finance_site_wise_report', ['site_id', 'site_name', 'total_amount', 'received_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)/export')
    def export_site_specific_report(self, request, site_id=None):
        report_data = self.site_specific_report(request, site_id).data
        return self._export_report(report_data, f'finance_site_{site_id}_report', ['party_id', 'party_name', 'total_amount', 'received_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path='reports/receivables/pdf')
    def export_receivables_report_pdf(self, request):
        report_data = self.receivables_report(request).data
        return self._export_pdf(report_data, 'finance_receivables_report')

    @action(detail=False, methods=['get'], url_path='reports/site-wise/pdf')
    def export_site_wise_report_pdf(self, request):
        report_data = self.site_wise_report(request).data
        return self._export_pdf(report_data, 'finance_site_wise_report')

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)/pdf')
    def export_site_specific_report_pdf(self, request, site_id=None):
        report_data = self.site_specific_report(request, site_id).data
        return self._export_pdf(report_data, f'finance_site_{site_id}_report')

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
        return build_pdf_response(
            filename_base=filename_base,
            title=filename_base.replace('_', ' ').title(),
            rows=report_data,
            headers=headers,
        )


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = Transaction.objects.select_related('party', 'site').all().order_by('id')
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['party', 'site', 'received', 'date']
    search_fields = ['party__name', 'site__name', 'phase_name', 'description']

    def get_queryset(self):
        normalize_receipt_style_invoices()
        return super().get_queryset()

    @action(detail=True, methods=['post'], url_path='receive-payment')
    def receive_payment(self, request, pk=None):
        invoice = self.get_object()

        amount = request.data.get('amount')
        if amount in (None, ''):
            return Response({'amount': 'Amount is required.'}, status=400)

        try:
            receipt = ClientReceipt.objects.create(
                invoice=invoice,
                party=invoice.party,
                site=invoice.site,
                amount=amount,
                date=request.data.get('date') or invoice.date,
                payment_mode=request.data.get('payment_mode') or 'cash',
                sender_name=request.data.get('sender_name'),
                receiver_name=request.data.get('receiver_name'),
                cheque_number=request.data.get('cheque_number'),
                reference_number=request.data.get('reference_number'),
                notes=request.data.get('notes'),
            )
        except Exception as exc:
            detail = getattr(exc, 'message_dict', None) or {'detail': str(exc)}
            return Response(detail, status=400)

        invoice.sync_received_status(save=True)
        serializer = self.get_serializer(invoice)
        payload = serializer.data
        payload['receipt_id'] = receipt.id
        return Response(payload)


class MiscellaneousExpenseViewSet(viewsets.ModelViewSet):
    queryset = MiscellaneousExpense.objects.select_related('site', 'labour').all().order_by('-date', '-id')
    serializer_class = MiscellaneousExpenseSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['date', 'payment_mode']
    search_fields = ['title', 'paid_to_name', 'notes']


class OwnerPayoutViewSet(viewsets.ModelViewSet):
    queryset = OwnerPayout.objects.all().order_by('-date', '-id')
    serializer_class = OwnerPayoutSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['date', 'payment_mode']
    search_fields = ['sender_name', 'receiver_name', 'reference_number', 'remarks']
