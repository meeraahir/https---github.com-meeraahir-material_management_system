from io import BytesIO

from django.shortcuts import render
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, F, FloatField, Q
from .pdf_utils import build_pdf_sections_response
from openpyxl import Workbook

from sites.models import Site
from materials.models import Material, MaterialStock
from vendors.models import Vendor, VendorTransaction
from labour.models import Labour, LabourPayment
from finance.models import Party, Transaction, ClientReceipt
from .serializers import OwnerDashboardSerializer, PersonalAdminDashboardSerializer

# Create your views here.


class DashboardMixin:
    def get_dashboard_data(self, user):
        sites = list(Site.objects.order_by('-id').values('id', 'name', 'location', 'description')[:5])
        materials = list(Material.objects.order_by('-id').values('id', 'name', 'unit')[:5])
        vendors = list(Vendor.objects.order_by('-id').values('id', 'name', 'phone', 'address')[:5])

        total_material_cost = MaterialStock.objects.aggregate(
            total=Sum(F('quantity_received') * F('cost_per_unit') + F('transport_cost'), output_field=FloatField())
        )['total'] or 0
        total_vendor_cost = VendorTransaction.objects.aggregate(total=Sum('total_amount'))['total'] or 0
        total_labour_cost = LabourPayment.objects.aggregate(total=Sum('paid_amount', output_field=FloatField()))['total'] or 0
        pending_labour_amounts = LabourPayment.objects.aggregate(total=Sum(F('total_amount') - F('paid_amount'), output_field=FloatField()))['total'] or 0
        total_receivables = Transaction.objects.aggregate(total=Sum('amount'))['total'] or 0
        total_received = ClientReceipt.objects.aggregate(total=Sum('amount'))['total'] or 0
        pending_receivables = total_receivables - total_received
        other_vendor_expenses = VendorTransaction.objects.filter(material__isnull=True).aggregate(total=Sum('total_amount', output_field=FloatField()))['total'] or 0
        total_expenses = total_material_cost + total_labour_cost + other_vendor_expenses
        pending_vendor_amounts = VendorTransaction.objects.aggregate(total=Sum(F('total_amount') - F('paid_amount'), output_field=FloatField()))['total'] or 0

        data = {
            'total_sites': Site.objects.count(),
            'total_materials': Material.objects.count(),
            'total_vendors': Vendor.objects.count(),
            'total_expenses': total_expenses,
            'total_material_cost': total_material_cost,
            'total_vendor_cost': total_vendor_cost,
            'total_labour_cost': total_labour_cost,
            'total_receivables': total_receivables,
            'total_received': total_received,
            'pending_receivables': pending_receivables,
            'pending_vendor_amounts': pending_vendor_amounts,
            'pending_labour_amounts': pending_labour_amounts,
            'recent_sites': sites,
            'recent_materials': materials,
            'recent_vendors': vendors,
        }

        if getattr(user, 'role', None) == 'admin':
            data.update({
                'total_labour': Labour.objects.count(),
                'total_finance_parties': Party.objects.count(),
                'total_finance_transactions': Transaction.objects.count(),
                'total_material_stock': MaterialStock.objects.aggregate(total=Sum('quantity_received'))['total'] or 0,
                'total_vendor_transactions': VendorTransaction.objects.count(),
                'recent_labour': list(Labour.objects.order_by('-id').values('id', 'name', 'phone')[:5]),
                'recent_transactions': list(Transaction.objects.order_by('-id').values('id', 'amount', 'received', 'date')[:5]),
            })

        return data

    def _export_excel(self, data, filename_base):
        workbook = Workbook()
        sheet = workbook.active
        sheet.title = 'Dashboard'
        sheet.append(['Metric', 'Value'])
        for key, value in data.items():
            if isinstance(value, (list, dict)):
                continue
            sheet.append([key, value])

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
            (key, value)
            for key, value in data.items()
            if not isinstance(value, (list, dict))
        ]
        sections = [
            {'title': 'Recent Sites', 'rows': data.get('recent_sites', [])},
            {'title': 'Recent Materials', 'rows': data.get('recent_materials', [])},
            {'title': 'Recent Vendors', 'rows': data.get('recent_vendors', [])},
        ]
        if data.get('recent_labour'):
            sections.append({'title': 'Recent Labour', 'rows': data.get('recent_labour', [])})
        if data.get('recent_transactions'):
            sections.append({'title': 'Recent Transactions', 'rows': data.get('recent_transactions', [])})

        return build_pdf_sections_response(
            filename_base=filename_base,
            title='Dashboard Summary',
            summary_rows=summary_rows,
            sections=sections,
        )


class DashboardView(DashboardMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(self.get_dashboard_data(request.user))


class DashboardChartView(DashboardMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(self.get_dashboard_data(request.user))


class DashboardExportView(DashboardMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return self._export_excel(self.get_dashboard_data(request.user), 'core_dashboard')


class DashboardPDFView(DashboardMixin, APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return self._export_pdf(self.get_dashboard_data(request.user), 'core_dashboard')


class PersonalAdminDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        selected_date_param = request.query_params.get('date')
        if selected_date_param:
            selected_date = parse_date(selected_date_param)
            if selected_date is None:
                return Response({'date': 'Date must be in YYYY-MM-DD format.'}, status=400)
        else:
            selected_date = timezone.localdate()

        serializer = PersonalAdminDashboardSerializer(
            instance={},
            context={'request': request, 'selected_date': selected_date},
        )
        return Response(serializer.data)


class OwnerDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        selected_date_param = request.query_params.get('date')
        if selected_date_param:
            selected_date = parse_date(selected_date_param)
            if selected_date is None:
                return Response({'date': 'Date must be in YYYY-MM-DD format.'}, status=400)
        else:
            selected_date = timezone.localdate()

        serializer = OwnerDashboardSerializer(
            instance={},
            context={'request': request, 'selected_date': selected_date},
        )
        return Response(serializer.data)
