from django.shortcuts import render
from io import BytesIO

from django.db.models import Sum, F, FloatField, Count, Q
from django.http import HttpResponse
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Site
from .serializers import SiteSerializer
from .permissions import IsAdminOrReadOnly
from materials.models import MaterialStock
from vendors.models import VendorTransaction
from labour.models import LabourAttendance
from finance.models import Transaction

# Create your views here.


class SiteViewSet(viewsets.ModelViewSet):
    queryset = Site.objects.all().order_by('id')
    serializer_class = SiteSerializer
    permission_classes = [IsAdminOrReadOnly]
    filterset_fields = ['name', 'location']
    search_fields = ['name', 'location', 'description']

    def _get_dashboard_data(self, site):
        material_data = MaterialStock.objects.filter(site=site).select_related('material').values('material__id', 'material__name').annotate(
            total_received=Sum('quantity_received', output_field=FloatField()),
            total_used=Sum('quantity_used', output_field=FloatField()),
            total_cost=Sum(F('quantity_received') * F('cost_per_unit') + F('transport_cost'), output_field=FloatField()),
            remaining_stock=Sum(F('quantity_received') - F('quantity_used'), output_field=FloatField()),
        )
        vendor_data = VendorTransaction.objects.filter(site=site).values('vendor__id', 'vendor__name').annotate(
            total_amount_sum=Sum('total_amount', output_field=FloatField()),
            paid_amount_sum=Sum('paid_amount', output_field=FloatField()),
            pending_amount_sum=(
                Sum('total_amount', output_field=FloatField())
                - Sum('paid_amount', output_field=FloatField())
            ),
        )
        labour_data = LabourAttendance.objects.filter(site=site).values('labour__id', 'labour__name').annotate(
            present_count=Count('id', filter=Q(present=True)),
            total_days=Count('id'),
        )
        finance_data = Transaction.objects.filter(site=site).values('party__id', 'party__name').annotate(
            total_amount=Sum('amount', output_field=FloatField()),
            received_amount=Sum('amount', filter=Q(received=True), output_field=FloatField()),
            pending_amount=Sum('amount', filter=Q(received=False), output_field=FloatField()),
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
                }
                for item in labour_data
            ],
            'finance_summary': list(finance_data),
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
        output = BytesIO()
        canvas = Canvas(output, pagesize=letter)
        width, height = letter
        y = height - inch
        canvas.setFont('Helvetica-Bold', 12)
        canvas.drawString(inch, y, f"Site Dashboard {data['site']['name']}")
        y -= 0.4 * inch
        canvas.setFont('Helvetica', 10)
        for key, value in [
            ('Site ID', data['site']['id']),
            ('Location', data['site']['location']),
            ('Material Summary Count', len(data['material_summary'])),
            ('Vendor Summary Count', len(data['vendor_summary'])),
            ('Labour Summary Count', len(data['labour_summary'])),
            ('Finance Summary Count', len(data['finance_summary'])),
        ]:
            canvas.drawString(inch, y, f'{key}: {value}')
            y -= 0.25 * inch
        y -= 0.2 * inch

        def draw_rows(title, rows):
            nonlocal y
            canvas.setFont('Helvetica-Bold', 11)
            canvas.drawString(inch, y, title)
            y -= 0.25 * inch
            canvas.setFont('Helvetica', 9)
            if not rows:
                canvas.drawString(inch, y, 'No data available')
                y -= 0.25 * inch
                return
            headers = list(rows[0].keys())
            canvas.drawString(inch, y, ' | '.join(headers))
            y -= 0.2 * inch
            for row in rows:
                if y < inch:
                    canvas.showPage()
                    canvas.setFont('Helvetica', 9)
                    y = height - inch
                canvas.drawString(inch, y, ' | '.join(str(row.get(k, '')) for k in headers))
                y -= 0.2 * inch
            y -= 0.1 * inch

        draw_rows('Material Summary', data['material_summary'])
        draw_rows('Vendor Summary', data['vendor_summary'])
        draw_rows('Labour Summary', data['labour_summary'])
        draw_rows('Finance Summary', data['finance_summary'])
        canvas.save()
        output.seek(0)
        response = HttpResponse(output.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename_base}.pdf"'
        return response
