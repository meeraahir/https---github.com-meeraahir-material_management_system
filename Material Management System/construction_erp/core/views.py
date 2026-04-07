from io import BytesIO

from django.shortcuts import render
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum, Count, F, FloatField, Q
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.pdfgen.canvas import Canvas
from openpyxl import Workbook

from sites.models import Site
from materials.models import Material, MaterialStock
from vendors.models import Vendor, VendorTransaction
from labour.models import Labour, LabourPayment
from finance.models import Party, Transaction

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
        total_labour_cost = LabourPayment.objects.aggregate(total=Sum('total_amount'))['total'] or 0
        total_receivables = Transaction.objects.aggregate(total=Sum('amount'))['total'] or 0
        total_received = Transaction.objects.filter(received=True).aggregate(total=Sum('amount'))['total'] or 0
        pending_receivables = Transaction.objects.filter(received=False).aggregate(total=Sum('amount'))['total'] or 0
        pending_vendor_amounts = VendorTransaction.objects.aggregate(total=Sum(F('total_amount') - F('paid_amount'), output_field=FloatField()))['total'] or 0
        pending_labour_amounts = LabourPayment.objects.aggregate(total=Sum(F('total_amount') - F('paid_amount'), output_field=FloatField()))['total'] or 0

        data = {
            'total_sites': Site.objects.count(),
            'total_materials': Material.objects.count(),
            'total_vendors': Vendor.objects.count(),
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
        output = BytesIO()
        canvas = Canvas(output, pagesize=letter)
        width, height = letter
        y = height - inch
        canvas.setFont('Helvetica-Bold', 12)
        canvas.drawString(inch, y, 'Dashboard Summary')
        y -= 0.4 * inch
        canvas.setFont('Helvetica', 10)
        for key, value in data.items():
            if isinstance(value, (list, dict)):
                continue
            canvas.drawString(inch, y, f'{key}: {value}')
            y -= 0.25 * inch
            if y < inch:
                canvas.showPage()
                canvas.setFont('Helvetica', 10)
                y = height - inch

        canvas.save()
        output.seek(0)
        response = HttpResponse(output.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename_base}.pdf"'
        return response


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
