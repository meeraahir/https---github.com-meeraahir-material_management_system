from datetime import date
from io import BytesIO

from django.db import transaction
from django.db.models import Sum, F, FloatField, Count, Q, Case, When, Value
from django.db.models.functions import TruncWeek, TruncMonth
from django.http import HttpResponse
from core.pdf_utils import build_pdf_response
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from openpyxl import Workbook

from sites.permissions import IsAdminOrReadOnly
from .models import CasualLabourEntry, Labour, LabourAttendance, LabourPayment, LabourPaymentEntry
from .serializers import CasualLabourEntrySerializer, LabourSerializer, LabourAttendanceSerializer, LabourPaymentSerializer


class LabourViewSet(viewsets.ModelViewSet):
    queryset = Labour.objects.all().order_by('id')
    serializer_class = LabourSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['name', 'labour_type']
    search_fields = ['name', 'phone', 'labour_type']

    def _date_range(self):
        return self.request.query_params.get('date_from'), self.request.query_params.get('date_to')

    def _filtered_attendance(self):
        attendance = LabourAttendance.objects.all()
        date_from, date_to = self._date_range()
        if date_from:
            attendance = attendance.filter(date__gte=date_from)
        if date_to:
            attendance = attendance.filter(date__lte=date_to)
        return attendance

    def _filtered_payments(self):
        payments = LabourPayment.objects.all()
        date_from, date_to = self._date_range()
        if date_from:
            payments = payments.filter(date__gte=date_from)
        if date_to:
            payments = payments.filter(date__lte=date_to)
        return payments

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

    @action(detail=True, methods=['get'], url_path='attendance-monthly-report')
    def attendance_monthly_report_by_labour(self, request, pk=None):
        labour = self.get_object()
        params = request.query_params
        errors = {}

        year = None
        month = None
        site_id = None
        date_from = None
        date_to = None

        if params.get('year'):
            try:
                year = int(params.get('year'))
                if year < 1 or year > 9999:
                    errors['year'] = 'Year must be between 1 and 9999.'
            except (TypeError, ValueError):
                errors['year'] = 'Year must be a valid number.'

        if params.get('month'):
            try:
                month = int(params.get('month'))
                if month < 1 or month > 12:
                    errors['month'] = 'Month must be between 1 and 12.'
            except (TypeError, ValueError):
                errors['month'] = 'Month must be a valid number.'

        if month and not year:
            errors['year'] = 'Year is required when month is provided.'

        if params.get('site'):
            try:
                site_id = int(params.get('site'))
            except (TypeError, ValueError):
                errors['site'] = 'Site must be a valid number.'

        if params.get('date_from'):
            try:
                date_from = date.fromisoformat(params.get('date_from'))
            except ValueError:
                errors['date_from'] = 'Date from must use YYYY-MM-DD format.'

        if params.get('date_to'):
            try:
                date_to = date.fromisoformat(params.get('date_to'))
            except ValueError:
                errors['date_to'] = 'Date to must use YYYY-MM-DD format.'

        if date_from and date_to and date_from > date_to:
            errors['date_to'] = 'Date to must be on or after date from.'

        if errors:
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)

        attendance = LabourAttendance.objects.filter(labour=labour)
        if year:
            attendance = attendance.filter(date__year=year)
        if month:
            attendance = attendance.filter(date__month=month)
        if site_id:
            attendance = attendance.filter(site_id=site_id)
        if date_from:
            attendance = attendance.filter(date__gte=date_from)
        if date_to:
            attendance = attendance.filter(date__lte=date_to)

        data = (
            attendance.annotate(month_start=TruncMonth('date'))
            .values('month_start')
            .annotate(
                present_days=Count('id', filter=Q(present=True)),
                total_days=Count('id'),
            )
            .order_by('month_start')
        )

        monthly_rows = []
        for item in data:
            present_days = int(item['present_days'] or 0)
            total_days = int(item['total_days'] or 0)
            month_start = item['month_start']
            monthly_rows.append({
                'month': month_start.strftime('%Y-%m'),
                'month_start': month_start.date() if hasattr(month_start, 'date') else month_start,
                'present_days': present_days,
                'absent_days': total_days - present_days,
                'total_days': total_days,
                'total_wage': present_days * labour.per_day_wage,
            })

        if year and month and not monthly_rows:
            month_start = date(year, month, 1)
            monthly_rows.append({
                'month': month_start.strftime('%Y-%m'),
                'month_start': month_start,
                'present_days': 0,
                'absent_days': 0,
                'total_days': 0,
                'total_wage': 0,
            })

        totals = {
            'present_days': sum(row['present_days'] for row in monthly_rows),
            'absent_days': sum(row['absent_days'] for row in monthly_rows),
            'total_days': sum(row['total_days'] for row in monthly_rows),
            'total_wage': sum(row['total_wage'] for row in monthly_rows),
        }

        return Response({
            'labour_id': labour.id,
            'labour_name': labour.name,
            'per_day_wage': labour.per_day_wage,
            'filters': {
                'year': year,
                'month': month,
                'site': site_id,
                'date_from': date_from,
                'date_to': date_to,
            },
            'totals': totals,
            'months': monthly_rows,
        })

    @action(detail=True, methods=['get'], url_path='payment-ledger')
    def payment_ledger(self, request, pk=None):
        labour = self.get_object()
        wage_entries = LabourPayment.objects.filter(labour=labour).select_related('site')
        payment_entries = LabourPaymentEntry.objects.filter(labour=labour).select_related('site', 'payment')
        date_from, date_to = self._date_range()

        if date_from:
            wage_entries = wage_entries.filter(date__gte=date_from)
            payment_entries = payment_entries.filter(date__gte=date_from)
        if date_to:
            wage_entries = wage_entries.filter(date__lte=date_to)
            payment_entries = payment_entries.filter(date__lte=date_to)

        entries = []
        for wage_entry in wage_entries:
            entries.append({
                'id': f'wage-{wage_entry.id}',
                'entry_type': 'wage',
                'site': wage_entry.site.name if wage_entry.site else None,
                'debit': wage_entry.total_amount,
                'credit': 0,
                'date': wage_entry.date,
                '_sort_id': wage_entry.id,
                '_sort_priority': 0,
            })

        for payment_entry in payment_entries:
            entries.append({
                'id': f'payment-{payment_entry.id}',
                'entry_type': 'payment',
                'site': payment_entry.site.name if payment_entry.site else None,
                'debit': 0,
                'credit': payment_entry.amount,
                'date': payment_entry.date,
                '_sort_id': payment_entry.id,
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
            'paid_amount': sum(item['credit'] for item in data),
            'pending_amount': running_balance,
        }
        return Response({'labour': labour.name, 'payments': data, 'totals': totals})

    @action(detail=True, methods=['get'], url_path='payment-ledger/export')
    def export_payment_ledger(self, request, pk=None):
        ledger_data = self.payment_ledger(request, pk).data
        rows = ledger_data['payments']
        return self._export_report(rows, f"labour_{ledger_data['labour']}_payment_ledger", ['id', 'entry_type', 'site', 'debit', 'credit', 'balance', 'date'])

    @action(detail=True, methods=['get'], url_path='payment-ledger/pdf')
    def export_payment_ledger_pdf(self, request, pk=None):
        ledger_data = self.payment_ledger(request, pk).data
        rows = ledger_data['payments']
        return self._export_pdf(rows, f"labour_{ledger_data['labour']}_payment_ledger")

    @action(detail=False, methods=['get'], url_path='reports/wage')
    def wage_report(self, request):
        attendance_filter = Q()
        date_from, date_to = self._date_range()
        if date_from:
            attendance_filter &= Q(labourattendance__date__gte=date_from)
        if date_to:
            attendance_filter &= Q(labourattendance__date__lte=date_to)

        data = (
            Labour.objects.annotate(
                present_count=Count('labourattendance', filter=Q(labourattendance__present=True) & attendance_filter),
                attendance_count=Count('labourattendance', filter=attendance_filter),
            )
            .values('id', 'name', 'phone', 'per_day_wage', 'attendance_count', 'present_count')
            .order_by('id')
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
        attendance = self._filtered_attendance()

        data = (
            attendance.values('labour__id', 'labour__name')
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
        attendance = self._filtered_attendance()

        data = (
            attendance.values('date')
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
        attendance = self._filtered_attendance()

        data = (
            attendance.annotate(week=TruncWeek('date'))
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
        attendance = self._filtered_attendance()

        data = (
            attendance.annotate(month=TruncMonth('date'))
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
        payments = self._filtered_payments()

        data = (
            payments.values('labour__id', 'labour__name')
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

    @action(detail=False, methods=['get'], url_path='reports/site-wise')
    def site_wise_report(self, request):
        attendance = self._filtered_attendance()
        payments = self._filtered_payments()

        attendance_data = (
            attendance.values('site__id', 'site__name')
            .annotate(
                present_count=Count('id', filter=Q(present=True)),
                total_days=Count('id'),
                total_wage=Sum(
                    Case(
                        When(present=True, then=F('labour__per_day_wage')),
                        default=Value(0),
                        output_field=FloatField(),
                    )
                ),
            )
            .order_by('site__name')
        )
        payment_map = {
            item['site__id']: {
                'paid_amount': item['paid_amount_sum'] or 0,
                'pending_amount': (item['total_amount_sum'] or 0) - (item['paid_amount_sum'] or 0),
            }
            for item in payments.values('site__id').annotate(
                total_amount_sum=Sum('total_amount', output_field=FloatField()),
                paid_amount_sum=Sum('paid_amount', output_field=FloatField()),
            )
        }
        return Response([
            {
                'site_id': item['site__id'],
                'site_name': item['site__name'],
                'present_count': int(item['present_count'] or 0),
                'total_days': item['total_days'],
                'absent_count': item['total_days'] - int(item['present_count'] or 0),
                'total_wage': item['total_wage'] or 0,
                'paid_amount': payment_map.get(item['site__id'], {}).get('paid_amount', 0),
                'pending_amount': payment_map.get(item['site__id'], {}).get('pending_amount', 0),
            }
            for item in attendance_data
        ])

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)')
    def site_specific_report(self, request, site_id=None):
        attendance = self._filtered_attendance().filter(site_id=site_id)
        payments = self._filtered_payments().filter(site_id=site_id)

        attendance_data = (
            attendance.values('labour__id', 'labour__name')
            .annotate(
                present_count=Count('id', filter=Q(present=True)),
                total_days=Count('id'),
                total_wage=Sum(
                    Case(
                        When(present=True, then=F('labour__per_day_wage')),
                        default=Value(0),
                        output_field=FloatField(),
                    )
                ),
            )
            .order_by('labour__name')
        )
        payment_map = {
            item['labour__id']: {
                'paid_amount': item['paid_amount_sum'] or 0,
                'pending_amount': (item['total_amount_sum'] or 0) - (item['paid_amount_sum'] or 0),
            }
            for item in payments.values('labour__id').annotate(
                total_amount_sum=Sum('total_amount', output_field=FloatField()),
                paid_amount_sum=Sum('paid_amount', output_field=FloatField()),
            )
        }
        return Response([
            {
                'labour_id': item['labour__id'],
                'labour_name': item['labour__name'],
                'present_count': int(item['present_count'] or 0),
                'total_days': item['total_days'],
                'absent_count': item['total_days'] - int(item['present_count'] or 0),
                'total_wage': item['total_wage'] or 0,
                'paid_amount': payment_map.get(item['labour__id'], {}).get('paid_amount', 0),
                'pending_amount': payment_map.get(item['labour__id'], {}).get('pending_amount', 0),
            }
            for item in attendance_data
        ])

    @action(detail=False, methods=['get'], url_path='reports/payment-summary/export')
    def export_payment_summary(self, request):
        report_data = self.payment_summary(request).data
        return self._export_report(report_data, 'labour_payment_summary', ['labour_id', 'labour_name', 'total_amount', 'paid_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path='reports/site-wise/export')
    def export_site_wise_report(self, request):
        report_data = self.site_wise_report(request).data
        return self._export_report(report_data, 'labour_site_wise_report', ['site_id', 'site_name', 'present_count', 'total_days', 'absent_count', 'total_wage', 'paid_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)/export')
    def export_site_specific_report(self, request, site_id=None):
        report_data = self.site_specific_report(request, site_id).data
        return self._export_report(report_data, f'labour_site_{site_id}_report', ['labour_id', 'labour_name', 'present_count', 'total_days', 'absent_count', 'total_wage', 'paid_amount', 'pending_amount'])

    @action(detail=False, methods=['get'], url_path='reports/payment-summary/pdf')
    def export_payment_summary_pdf(self, request):
        report_data = self.payment_summary(request).data
        return self._export_pdf(report_data, 'labour_payment_summary')

    @action(detail=False, methods=['get'], url_path='reports/site-wise/pdf')
    def export_site_wise_report_pdf(self, request):
        report_data = self.site_wise_report(request).data
        return self._export_pdf(report_data, 'labour_site_wise_report')

    @action(detail=False, methods=['get'], url_path=r'reports/site/(?P<site_id>[^/.]+)/pdf')
    def export_site_specific_report_pdf(self, request, site_id=None):
        report_data = self.site_specific_report(request, site_id).data
        return self._export_pdf(report_data, f'labour_site_{site_id}_report')

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
        return build_pdf_response(
            filename_base=filename_base,
            title=filename_base.replace('_', ' ').title(),
            rows=report_data,
            headers=headers,
        )


class LabourAttendanceViewSet(viewsets.ModelViewSet):
    queryset = LabourAttendance.objects.select_related('labour', 'site').all().order_by('id')
    serializer_class = LabourAttendanceSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['labour', 'site', 'date', 'present']
    search_fields = ['labour__name', 'site__name']


class CasualLabourEntryViewSet(viewsets.ModelViewSet):
    queryset = CasualLabourEntry.objects.select_related('site').all().order_by('id')
    serializer_class = CasualLabourEntrySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['site', 'date', 'labour_type']
    search_fields = ['labour_name', 'labour_type', 'site__name']


class LabourPaymentViewSet(viewsets.ModelViewSet):
    queryset = LabourPayment.objects.select_related('labour', 'site').all().order_by('id')
    serializer_class = LabourPaymentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['labour', 'site', 'date', 'period_start', 'period_end']
    search_fields = ['labour__name', 'site__name', 'notes']

    def get_queryset(self):
        if getattr(self, 'action', None) == 'list':
            self._merge_duplicate_wage_entries()

        return LabourPayment.objects.select_related('labour', 'site').all().order_by('id')

    def _merge_duplicate_wage_entries(self):
        duplicate_groups = (
            LabourPayment.objects.values('labour_id', 'site_id', 'period_start', 'period_end')
            .annotate(entry_count=Count('id'))
            .filter(entry_count__gt=1)
        )

        for group in duplicate_groups:
            with transaction.atomic():
                entries = list(
                    LabourPayment.objects.select_for_update()
                    .filter(
                        labour_id=group['labour_id'],
                        site_id=group['site_id'],
                        period_start=group['period_start'],
                        period_end=group['period_end'],
                    )
                    .order_by('id')
                )

                if len(entries) <= 1:
                    continue

                canonical_entry = entries[0]
                duplicate_entries = entries[1:]
                combined_paid_amount = sum(entry.payments_total() for entry in entries)
                canonical_entry.total_amount = max(
                    [entry.total_amount for entry in entries] + [combined_paid_amount]
                )
                canonical_entry.save()

                for duplicate_entry in duplicate_entries:
                    for payment_entry in duplicate_entry.payment_entries.all():
                        payment_entry.payment = canonical_entry
                        payment_entry.site = canonical_entry.site
                        payment_entry.save()
                    duplicate_entry.delete()

                canonical_entry.refresh_paid_amount(save=True)
