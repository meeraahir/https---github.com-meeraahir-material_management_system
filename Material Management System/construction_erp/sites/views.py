from django.shortcuts import render
from io import BytesIO

from django.db.models import Sum, F, FloatField, Count, Q
from django.http import HttpResponse
from openpyxl import Workbook
from core.pdf_utils import build_pdf_sections_response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Site
from .serializers import SiteSerializer
from .permissions import IsAdminOrReadOnly
from materials.models import MaterialStock
from vendors.models import VendorTransaction
from labour.models import LabourAttendance, LabourPayment
from finance.models import Transaction, ClientReceipt

# Create your views here.


class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.all().order_by('id')
    serializer_class = SiteSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name', 'location']
    search_fields = ['name', 'location', 'description']

    def _get_dashboard_data(self, site):
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        material_qs = MaterialStock.objects.filter(site=site)
        vendor_qs = VendorTransaction.objects.filter(site=site)
        attendance_qs = LabourAttendance.objects.filter(site=site)
        finance_invoice_qs = Transaction.objects.filter(site=site)
        finance_receipt_qs = ClientReceipt.objects.filter(site=site)
        labour_payment_qs = LabourPayment.objects.filter(site=site)

        if date_from:
            material_qs = material_qs.filter(date__gte=date_from)
            vendor_qs = vendor_qs.filter(date__gte=date_from)
            attendance_qs = attendance_qs.filter(date__gte=date_from)
            finance_invoice_qs = finance_invoice_qs.filter(date__gte=date_from)
            finance_receipt_qs = finance_receipt_qs.filter(date__gte=date_from)
            labour_payment_qs = labour_payment_qs.filter(date__gte=date_from)
        if date_to:
            material_qs = material_qs.filter(date__lte=date_to)
            vendor_qs = vendor_qs.filter(date__lte=date_to)
            attendance_qs = attendance_qs.filter(date__lte=date_to)
            finance_invoice_qs = finance_invoice_qs.filter(date__lte=date_to)
            finance_receipt_qs = finance_receipt_qs.filter(date__lte=date_to)
            labour_payment_qs = labour_payment_qs.filter(date__lte=date_to)

        material_data = material_qs.select_related('material').values('material__id', 'material__name').annotate(
            total_received=Sum('quantity_received', output_field=FloatField()),
            total_used=Sum('quantity_used', output_field=FloatField()),
            total_cost=Sum(F('quantity_received') * F('cost_per_unit') + F('transport_cost'), output_field=FloatField()),
            remaining_stock=Sum(F('quantity_received') - F('quantity_used'), output_field=FloatField()),
        )
        vendor_data = vendor_qs.values('vendor__id', 'vendor__name').annotate(
            total_amount_sum=Sum('total_amount', output_field=FloatField()),
            paid_amount_sum=Sum('paid_amount', output_field=FloatField()),
            pending_amount_sum=(
                Sum('total_amount', output_field=FloatField())
                - Sum('paid_amount', output_field=FloatField())
            ),
        )
        labour_data = attendance_qs.values('labour__id', 'labour__name', 'labour__per_day_wage').annotate(
            present_count=Count('id', filter=Q(present=True)),
            total_days=Count('id'),
        )
        labour_payment_map = {
            item['labour__id']: {
                'paid_amount': item['paid_amount'] or 0,
                'pending_amount': item['pending_amount'] or 0,
            }
            for item in labour_payment_qs.values('labour__id').annotate(
                paid_amount=Sum('paid_amount', output_field=FloatField()),
                pending_amount=Sum(F('total_amount') - F('paid_amount'), output_field=FloatField()),
            )
        }
        receipt_map = {
            item['party__id']: item['received_amount'] or 0
            for item in finance_receipt_qs.values('party__id').annotate(
                received_amount=Sum('amount', output_field=FloatField())
            )
        }
        finance_rows = finance_invoice_qs.values('party__id', 'party__name').annotate(
            total_amount=Sum('amount', output_field=FloatField()),
        )
        return {
            'site': {'id': site.id, 'name': site.name, 'location': site.location, 'description': site.description},
            'material_summary': list(material_data),
            'vendor_summary': [
                {
                    'vendor_id': item['vendor__id'],
                    'vendor_name': item['vendor__name'],
                    'total_amount': item['total_amount_sum'] or 0,
                    'paid_amount': item['paid_amount_sum'] or 0,
                    'pending_amount': item['pending_amount_sum'] or 0,
                }
                for item in vendor_data
            ],
            'labour_summary': [
                {
                    'labour_id': item['labour__id'],
                    'labour_name': item['labour__name'],
                    'present_count': int(item['present_count'] or 0),
                    'total_days': item['total_days'],
                    'absent_count': item['total_days'] - int(item['present_count'] or 0),
                    'total_wage': float((item['present_count'] or 0) * (item['labour__per_day_wage'] or 0)),
                    'paid_amount': labour_payment_map.get(item['labour__id'], {}).get('paid_amount', 0),
                    'pending_amount': labour_payment_map.get(item['labour__id'], {}).get('pending_amount', 0),
                }
                for item in labour_data
            ],
            'finance_summary': [
                {
                    'party__id': item['party__id'],
                    'party__name': item['party__name'],
                    'total_amount': item['total_amount'] or 0,
                    'received_amount': receipt_map.get(item['party__id'], 0),
                    'pending_amount': (item['total_amount'] or 0) - receipt_map.get(item['party__id'], 0),
                }
                for item in finance_rows
            ],
        }

    @action(detail=True, methods=['get'], url_path='dashboard')
    def dashboard(self, request, pk=None):
        site = self.get_object()
        return Response(self._get_dashboard_data(site))

    @action(detail=True, methods=['get'], url_path='dashboard/chart')
    def chart_dashboard(self, request, pk=None):
        return self.dashboard(request, pk)

    @action(detail=True, methods=['get'], url_path='dashboard/export')
    def export_dashboard(self, request, pk=None):
        site = self.get_object()
        return self._export_dashboard_excel(self._get_dashboard_data(site), f'site_{site.id}_dashboard')

    @action(detail=True, methods=['get'], url_path='dashboard/export/pdf')
    def export_dashboard_pdf(self, request, pk=None):
        site = self.get_object()
        return self._export_pdf(self._get_dashboard_data(site), f'site_{site.id}_dashboard')

    def _export_dashboard_excel(self, data, filename_base):
        workbook = Workbook()
        summary_sheet = workbook.active
        summary_sheet.title = 'Summary'
        summary_sheet.append(['Metric', 'Value'])
        summary_sheet.append(['Site ID', data['site']['id']])
        summary_sheet.append(['Site Name', data['site']['name']])
        summary_sheet.append(['Location', data['site']['location']])
        summary_sheet.append(['Material Summary Count', len(data['material_summary'])])
        summary_sheet.append(['Vendor Summary Count', len(data['vendor_summary'])])
        summary_sheet.append(['Labour Summary Count', len(data['labour_summary'])])
        summary_sheet.append(['Finance Summary Count', len(data['finance_summary'])])

        def append_table(sheet_name, rows):
            sheet = workbook.create_sheet(title=sheet_name[:31])
            if rows:
                headers = list(rows[0].keys())
                sheet.append(headers)
                for row in rows:
                    sheet.append([row.get(key, '') for key in headers])
            else:
                sheet.append(['No data available'])

        append_table('Material Summary', data['material_summary'])
        append_table('Vendor Summary', data['vendor_summary'])
        append_table('Labour Summary', data['labour_summary'])
        append_table('Finance Summary', data['finance_summary'])

        output = BytesIO()
        workbook.save(output)
        output.seek(0)
        response = HttpResponse(
            output.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f'attachment; filename="{filename_base}.xlsx"'
        return response

    def _export_pdf(self, data, filename_base):
        summary_rows = [
            ('Site ID', data['site']['id']),
            ('Site Name', data['site']['name']),
            ('Location', data['site']['location']),
            ('Description', data['site']['description'] or '-'),
            ('Material Summary Count', len(data['material_summary'])),
            ('Vendor Summary Count', len(data['vendor_summary'])),
            ('Labour Summary Count', len(data['labour_summary'])),
            ('Finance Summary Count', len(data['finance_summary'])),
        ]
        sections = [
            {'title': 'Material Summary', 'rows': data['material_summary']},
            {'title': 'Vendor Summary', 'rows': data['vendor_summary']},
            {'title': 'Labour Summary', 'rows': data['labour_summary']},
            {'title': 'Finance Summary', 'rows': data['finance_summary']},
        ]
        return build_pdf_sections_response(
            filename_base=filename_base,
            title=f"Site Dashboard {data['site']['name']}",
            summary_rows=summary_rows,
            sections=sections,
        )
