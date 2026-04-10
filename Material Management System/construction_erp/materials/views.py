from io import BytesIO
from numbers import Number

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
from .models import Material, MaterialStock, MaterialUsage
from .serializers import MaterialSerializer, MaterialStockSerializer, MaterialUsageSerializer


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all().order_by('id')
    serializer_class = MaterialSerializer
    permission_classes = [IsAdminOrReadOnly]
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

    def _apply_date_range(self, queryset):
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')

        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)

        return queryset

    def _format_export_value(self, key, value):
        if value is None:
            return ''

        if key.endswith('_id'):
            return value

        should_format_number = any(
            token in key
            for token in ['amount', 'cost', 'quantity', 'received', 'stock', 'used']
        )
        if should_format_number and isinstance(value, Number):
            formatted_value = f'{value:,.2f}'
            return formatted_value.rstrip('0').rstrip('.')

        return value

    def _format_export_rows(self, report_data):
        return [
            {
                key: self._format_export_value(key, value)
                for key, value in row.items()
            }
            for row in report_data
        ]

    @action(detail=False, methods=['get'], url_path='reports/material-wise')
    def material_wise_report(self, request):
        data = (
            self._apply_date_range(MaterialStock.objects.all()).values(
                'material__id',
                'material__name',
                'material__unit',
            )
            .annotate(
                total_quantity_received=Sum('quantity_received', output_field=FloatField()),
                total_quantity_used=Sum('quantity_used', output_field=FloatField()),
                material_amount=Sum(
                    F('quantity_received') * F('cost_per_unit'),
                    output_field=FloatField(),
                ),
                total_transport_cost=Sum('transport_cost', output_field=FloatField()),
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
                'material_unit': item['material__unit'],
                'cost_per_unit': (
                    (item['material_amount'] or 0) / item['total_quantity_received']
                    if item['total_quantity_received']
                    else 0
                ),
                'transport_cost': item['total_transport_cost'] or 0,
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
            self._apply_date_range(MaterialStock.objects.all()).values('site__id', 'site__name')
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
            self._apply_date_range(MaterialStock.objects.filter(site_id=site_id))
            .values('material__id', 'material__name', 'material__unit')
            .annotate(
                total_quantity_received=Sum('quantity_received', output_field=FloatField()),
                total_quantity_used=Sum('quantity_used', output_field=FloatField()),
                material_amount=Sum(
                    F('quantity_received') * F('cost_per_unit'),
                    output_field=FloatField(),
                ),
                total_transport_cost=Sum('transport_cost', output_field=FloatField()),
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
                'material_unit': item['material__unit'],
                'cost_per_unit': (
                    (item['material_amount'] or 0) / item['total_quantity_received']
                    if item['total_quantity_received']
                    else 0
                ),
                'transport_cost': item['total_transport_cost'] or 0,
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
        export_data = self._format_export_rows(report_data)

        if export_data:
            headers = list(export_data[0].keys())
            sheet.append(headers)
            for row in export_data:
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
            rows=self._format_export_rows(report_data),
            headers=headers,
        )


class MaterialUsageViewSet(viewsets.ModelViewSet):
    queryset = MaterialUsage.objects.select_related('receipt', 'site', 'material').all().order_by('id')
    serializer_class = MaterialUsageSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['site', 'material', 'receipt', 'date']
    search_fields = ['site__name', 'material__name', 'receipt__invoice_number']
