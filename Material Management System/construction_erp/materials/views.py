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
from .models import Material, MaterialStock
from .serializers import MaterialSerializer, MaterialStockSerializer


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all().order_by('id')
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name', 'unit']
    search_fields = ['name', 'unit']


class MaterialStockViewSet(viewsets.ModelViewSet):
    queryset = MaterialStock.objects.select_related('site', 'material').all().order_by('id')
    serializer_class = MaterialStockSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['site', 'material']
    search_fields = ['site__name', 'material__name']

    @action(detail=False, methods=['get'], url_path='reports/material-wise')
    def material_wise_report(self, request):
        data = (
            MaterialStock.objects.values('material__id', 'material__name')
            .annotate(
                total_quantity_received=Sum('quantity_received', output_field=FloatField()),
                total_quantity_used=Sum('quantity_used', output_field=FloatField()),
                total_cost=Sum(
                    F('quantity_received') * F('cost_per_unit') + F('transport_cost'),
                    output_field=FloatField(),
                ),
                remaining_stock=Sum(
                    F('quantity_received') - F('quantity_used'),
                    output_field=FloatField(),
                ),
            )
            .order_by('material__name')
        )
        return Response([
            {
                'material_id': item['material__id'],
                'material_name': item['material__name'],
                'total_quantity_received': item['total_quantity_received'],
                'total_quantity_used': item['total_quantity_used'],
                'remaining_stock': item['remaining_stock'],
                'total_cost': item['total_cost'],
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/site-wise')
    def site_wise_report(self, request):
        data = (
            MaterialStock.objects.values('site__id', 'site__name')
            .annotate(
                total_quantity_received=Sum('quantity_received', output_field=FloatField()),
                total_quantity_used=Sum('quantity_used', output_field=FloatField()),
                total_cost=Sum(
                    F('quantity_received') * F('cost_per_unit') + F('transport_cost'),
                    output_field=FloatField(),
                ),
                remaining_stock=Sum(
                    F('quantity_received') - F('quantity_used'),
                    output_field=FloatField(),
                ),
            )
            .order_by('site__name')
        )
        return Response([
            {
                'site_id': item['site__id'],
                'site_name': item['site__name'],
                'total_quantity_received': item['total_quantity_received'],
                'total_quantity_used': item['total_quantity_used'],
                'remaining_stock': item['remaining_stock'],
                'total_cost': item['total_cost'],
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/material-wise/export')
    def export_material_report(self, request):
        report_data = self.material_wise_report(request).data
        return self._export_report(report_data, 'Material Wise MaterialStock Report', 'material_report')

    @action(detail=False, methods=['get'], url_path='reports/site-wise/export')
    def export_site_report(self, request):
        report_data = self.site_wise_report(request).data
        return self._export_report(report_data, 'Site Wise MaterialStock Report', 'site_report')

    @action(detail=False, methods=['get'], url_path='chart/material-wise')
    def chart_material_wise(self, request):
        return self.material_wise_report(request)

    @action(detail=False, methods=['get'], url_path='chart/site-wise')
    def chart_site_wise(self, request):
        return self.site_wise_report(request)

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)')
    def site_specific_report(self, request, site_id=None):
        data = (
            MaterialStock.objects.filter(site_id=site_id)
            .values('material__id', 'material__name')
            .annotate(
                total_quantity_received=Sum('quantity_received', output_field=FloatField()),
                total_quantity_used=Sum('quantity_used', output_field=FloatField()),
                total_cost=Sum(
                    F('quantity_received') * F('cost_per_unit') + F('transport_cost'),
                    output_field=FloatField(),
                ),
                remaining_stock=Sum(
                    F('quantity_received') - F('quantity_used'),
                    output_field=FloatField(),
                ),
            )
            .order_by('material__name')
        )
        return Response([
            {
                'material_id': item['material__id'],
                'material_name': item['material__name'],
                'total_quantity_received': item['total_quantity_received'],
                'total_quantity_used': item['total_quantity_used'],
                'remaining_stock': item['remaining_stock'],
                'total_cost': item['total_cost'],
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)/export')
    def export_site_specific_report(self, request, site_id=None):
        report_data = self.site_specific_report(request, site_id).data
        return self._export_report(report_data, f'Site {site_id} Material Report', f'site_{site_id}_material_report')

    @action(detail=False, methods=['get'], url_path='reports/material-wise/pdf')
    def export_material_report_pdf(self, request):
        report_data = self.material_wise_report(request).data
        return self._export_pdf(report_data, 'material_report')

    @action(detail=False, methods=['get'], url_path='reports/site-wise/pdf')
    def export_site_report_pdf(self, request):
        report_data = self.site_wise_report(request).data
        return self._export_pdf(report_data, 'site_report')

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)/pdf')
    def export_site_specific_report_pdf(self, request, site_id=None):
        report_data = self.site_specific_report(request, site_id).data
        return self._export_pdf(report_data, f'site_{site_id}_material_report')

    def _export_report(self, report_data, title, filename_base):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = title[:31]

        if report_data:
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
