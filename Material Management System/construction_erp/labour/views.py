from io import BytesIO

from django.db.models import Sum, F, FloatField, Count, Q
from django.db.models.functions import TruncWeek, TruncMonth
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
from .models import Labour, LabourAttendance, LabourPayment
from .serializers import LabourSerializer, LabourAttendanceSerializer, LabourPaymentSerializer


class LabourViewSet(viewsets.ModelViewSet):
    queryset = Labour.objects.all().order_by('id')
    serializer_class = LabourSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name']
    search_fields = ['name', 'phone']

    @action(detail=True, methods=['get'], url_path='attendance-report')
    def attendance_report(self, request, pk=None):
        labour = self.get_object()
        attendance = LabourAttendance.objects.filter(labour=labour)
        present_count = attendance.filter(present=True).count()
        absent_count = attendance.filter(present=False).count()
        total_days = attendance.count()
        total_wage = present_count * labour.per_day_wage
        return Response({
            'labour': labour.name,
            'total_days': total_days,
            'present': present_count,
            'absent': absent_count,
            'per_day_wage': labour.per_day_wage,
            'total_wage': total_wage,
        })

    @action(detail=True, methods=['get'], url_path='payment-ledger')
    def payment_ledger(self, request, pk=None):
        labour = self.get_object()
        payments = LabourPayment.objects.filter(labour=labour)
        data = [
            {
                'id': payment.id,
                'total_amount': payment.total_amount,
                'paid_amount': payment.paid_amount,
                'pending_amount': payment.pending_amount(),
            }
            for payment in payments
        ]
        totals = {
            'total_amount': sum(item['total_amount'] for item in data),
            'paid_amount': sum(item['paid_amount'] for item in data),
            'pending_amount': sum(item['pending_amount'] for item in data),
        }
        return Response({'labour': labour.name, 'payments': data, 'totals': totals})

    @action(detail=True, methods=['get'], url_path='payment-ledger/export')
    def export_payment_ledger(self, request, pk=None):
        ledger_data = self.payment_ledger(request, pk).data
        rows = ledger_data['payments']
        return self._export_report(rows, f"labour_{ledger_data['labour']}_payment_ledger", ['id', 'total_amount', 'paid_amount', 'pending_amount'])

    @action(detail=True, methods=['get'], url_path='payment-ledger/pdf')
    def export_payment_ledger_pdf(self, request, pk=None):
        ledger_data = self.payment_ledger(request, pk).data
        rows = ledger_data['payments']
        return self._export_pdf(rows, f"labour_{ledger_data['labour']}_payment_ledger")

    @action(detail=False, methods=['get'], url_path='reports/wage')
    def wage_report(self, request):
        data = (
            Labour.objects.annotate(
                present_count=Count('labourattendance', filter=Q(labourattendance__present=True)),
                attendance_count=Count('labourattendance'),
            )
            .values('id', 'name', 'phone', 'per_day_wage', 'attendance_count', 'present_count')
        )
        report = []
        for item in data:
            present_count = item['present_count'] or 0
            report.append({
                'id': item['id'],
                'name': item['name'],
                'phone': item['phone'],
                'per_day_wage': item['per_day_wage'],
                'attendance_count': item['attendance_count'],
                'present_count': int(present_count),
                'total_wage': present_count * item['per_day_wage'],
            })
        return Response(report)

    @action(detail=False, methods=['get'], url_path='reports/wage/export')
    def export_wage_report(self, request):
        report_data = self.wage_report(request).data
        return self._export_report(report_data, 'labour_wage_report', ['id', 'name', 'phone', 'per_day_wage', 'attendance_count', 'present_count', 'total_wage'])

    @action(detail=False, methods=['get'], url_path='reports/wage/pdf')
    def export_wage_report_pdf(self, request):
        report_data = self.wage_report(request).data
        return self._export_pdf(report_data, 'labour_wage_report')

    @action(detail=False, methods=['get'], url_path='reports/attendance-summary')
    def attendance_summary(self, request):
        data = (
            LabourAttendance.objects.values('labour__id', 'labour__name')
            .annotate(
                present_count=Count('id', filter=Q(present=True)),
                total_days=Count('id'),
            )
            .order_by('labour__name')
        )
        return Response([
            {
                'labour_id': item['labour__id'],
                'labour_name': item['labour__name'],
                'present_count': int(item['present_count'] or 0),
                'total_days': item['total_days'],
                'absent_count': item['total_days'] - int(item['present_count'] or 0),
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/attendance-summary/export')
    def export_attendance_summary(self, request):
        report_data = self.attendance_summary(request).data
        return self._export_report(report_data, 'labour_attendance_summary', ['labour_id', 'labour_name', 'present_count', 'total_days', 'absent_count'])

    @action(detail=False, methods=['get'], url_path='reports/attendance-daily')
    def attendance_daily_report(self, request):
        data = (
            LabourAttendance.objects.values('date')
            .annotate(
                present_count=Count('id', filter=Q(present=True)),
                total_workers=Count('id'),
            )
            .order_by('date')
        )
        return Response([
            {
                'date': item['date'],
                'present_count': int(item['present_count'] or 0),
                'absent_count': int(item['total_workers'] - (item['present_count'] or 0)),
                'total_workers': item['total_workers'],
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/attendance-weekly')
    def attendance_weekly_report(self, request):
        data = (
            LabourAttendance.objects.annotate(week=TruncWeek('date'))
            .values('week')
            .annotate(
                present_count=Count('id', filter=Q(present=True)),
                total_workers=Count('id'),
            )
            .order_by('week')
        )
        return Response([
            {
                'week': item['week'],
                'present_count': int(item['present_count'] or 0),
                'absent_count': int(item['total_workers'] - (item['present_count'] or 0)),
                'total_workers': item['total_workers'],
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/attendance-monthly')
    def attendance_monthly_report(self, request):
        data = (
            LabourAttendance.objects.annotate(month=TruncMonth('date'))
            .values('month')
            .annotate(
                present_count=Count('id', filter=Q(present=True)),
                total_workers=Count('id'),
            )
            .order_by('month')
        )
        return Response([
            {
                'month': item['month'],
                'present_count': int(item['present_count'] or 0),
                'absent_count': int(item['total_workers'] - (item['present_count'] or 0)),
                'total_workers': item['total_workers'],
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/attendance-daily/export')
    def export_attendance_daily_report(self, request):
        report_data = self.attendance_daily_report(request).data
        return self._export_report(report_data, 'labour_attendance_daily', ['date', 'present_count', 'absent_count', 'total_workers'])

    @action(detail=False, methods=['get'], url_path='reports/attendance-weekly/export')
    def export_attendance_weekly_report(self, request):
        report_data = self.attendance_weekly_report(request).data
        return self._export_report(report_data, 'labour_attendance_weekly', ['week', 'present_count', 'absent_count', 'total_workers'])

    @action(detail=False, methods=['get'], url_path='reports/attendance-monthly/export')
    def export_attendance_monthly_report(self, request):
        report_data = self.attendance_monthly_report(request).data
        return self._export_report(report_data, 'labour_attendance_monthly', ['month', 'present_count', 'absent_count', 'total_workers'])

    @action(detail=False, methods=['get'], url_path='reports/attendance-daily/pdf')
    def export_attendance_daily_report_pdf(self, request):
        report_data = self.attendance_daily_report(request).data
        return self._export_pdf(report_data, 'labour_attendance_daily')

    @action(detail=False, methods=['get'], url_path='reports/attendance-weekly/pdf')
    def export_attendance_weekly_report_pdf(self, request):
        report_data = self.attendance_weekly_report(request).data
        return self._export_pdf(report_data, 'labour_attendance_weekly')

    @action(detail=False, methods=['get'], url_path='reports/attendance-monthly/pdf')
    def export_attendance_monthly_report_pdf(self, request):
        report_data = self.attendance_monthly_report(request).data
        return self._export_pdf(report_data, 'labour_attendance_monthly')

    @action(detail=False, methods=['get'], url_path='reports/payment-summary')
    def payment_summary(self, request):
        data = (
            LabourPayment.objects.values('labour__id', 'labour__name')
            .annotate(
                total_amount_sum=Sum('total_amount', output_field=FloatField()),
                paid_amount_sum=Sum('paid_amount', output_field=FloatField()),
                pending_amount_sum=(
                    Sum('total_amount', output_field=FloatField())
                    - Sum('paid_amount', output_field=FloatField())
                ),
            )
            .order_by('labour__name')
        )
        return Response([
            {
                'labour_id': item['labour__id'],
                'labour_name': item['labour__name'],
                'total_amount': item['total_amount_sum'] or 0,
                'paid_amount': item['paid_amount_sum'] or 0,
                'pending_amount': item['pending_amount_sum'] or 0,
            }
            for item in data
        ])

    @action(detail=False, methods=['get'], url_path='reports/payment-summary/export')
    def export_payment_summary(self, request):
        report_data = self.payment_summary(request).data
        return self._export_report(report_data, 'labour_payment_summary', ['labour_id', 'labour_name', 'total_amount', 'paid_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path='reports/payment-summary/pdf')
    def export_payment_summary_pdf(self, request):
        report_data = self.payment_summary(request).data
        return self._export_pdf(report_data, 'labour_payment_summary')

    @action(detail=False, methods=['get'], url_path='chart/wage')
    def chart_wage(self, request):
        return self.wage_report(request)

    @action(detail=False, methods=['get'], url_path='chart/attendance')
    def chart_attendance(self, request):
        return self.attendance_summary(request)

    @action(detail=False, methods=['get'], url_path='chart/payment')
    def chart_payment(self, request):
        return self.payment_summary(request)

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


class LabourAttendanceViewSet(viewsets.ModelViewSet):
    queryset = LabourAttendance.objects.select_related('labour', 'site').all().order_by('id')
    serializer_class = LabourAttendanceSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['labour', 'site', 'date', 'present']
    search_fields = ['labour__name', 'site__name']


class LabourPaymentViewSet(viewsets.ModelViewSet):
    queryset = LabourPayment.objects.select_related('labour').all().order_by('id')
    serializer_class = LabourPaymentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['labour']
    search_fields = ['labour__name']
