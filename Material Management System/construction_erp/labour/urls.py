from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LabourViewSet, LabourAttendanceViewSet, LabourPaymentViewSet

app_name = 'labour'

router = DefaultRouter()
router.register(r'labours', LabourViewSet)
router.register(r'attendance', LabourAttendanceViewSet)
router.register(r'payments', LabourPaymentViewSet)

urlpatterns = [
    # Clean aliases for frontend integration.
    path('', LabourViewSet.as_view({'get': 'list', 'post': 'create'}), name='labour-list'),
    path('<int:pk>/', LabourViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='labour-detail'),
    path('<int:pk>/payment-ledger/', LabourViewSet.as_view({'get': 'payment_ledger'}), name='labour-payment-ledger'),
    path('<int:pk>/payment-ledger/export/', LabourViewSet.as_view({'get': 'export_payment_ledger'}), name='labour-payment-ledger-export'),
    path('<int:pk>/payment-ledger/pdf/', LabourViewSet.as_view({'get': 'export_payment_ledger_pdf'}), name='labour-payment-ledger-pdf'),
    path('reports/wage/', LabourViewSet.as_view({'get': 'wage_report'}), name='labour-report-wage'),
    path('reports/wage/export/', LabourViewSet.as_view({'get': 'export_wage_report'}), name='labour-report-wage-export'),
    path('reports/wage/pdf/', LabourViewSet.as_view({'get': 'export_wage_report_pdf'}), name='labour-report-wage-pdf'),
    path('reports/attendance-summary/', LabourViewSet.as_view({'get': 'attendance_summary'}), name='labour-report-attendance-summary'),
    path('reports/attendance-summary/export/', LabourViewSet.as_view({'get': 'export_attendance_summary'}), name='labour-report-attendance-summary-export'),
    path('reports/attendance-daily/', LabourViewSet.as_view({'get': 'attendance_daily_report'}), name='labour-report-attendance-daily'),
    path('reports/attendance-daily/export/', LabourViewSet.as_view({'get': 'export_attendance_daily_report'}), name='labour-report-attendance-daily-export'),
    path('reports/attendance-daily/pdf/', LabourViewSet.as_view({'get': 'export_attendance_daily_report_pdf'}), name='labour-report-attendance-daily-pdf'),
    path('reports/attendance-weekly/', LabourViewSet.as_view({'get': 'attendance_weekly_report'}), name='labour-report-attendance-weekly'),
    path('reports/attendance-weekly/export/', LabourViewSet.as_view({'get': 'export_attendance_weekly_report'}), name='labour-report-attendance-weekly-export'),
    path('reports/attendance-weekly/pdf/', LabourViewSet.as_view({'get': 'export_attendance_weekly_report_pdf'}), name='labour-report-attendance-weekly-pdf'),
    path('reports/attendance-monthly/', LabourViewSet.as_view({'get': 'attendance_monthly_report'}), name='labour-report-attendance-monthly'),
    path('reports/attendance-monthly/export/', LabourViewSet.as_view({'get': 'export_attendance_monthly_report'}), name='labour-report-attendance-monthly-export'),
    path('reports/attendance-monthly/pdf/', LabourViewSet.as_view({'get': 'export_attendance_monthly_report_pdf'}), name='labour-report-attendance-monthly-pdf'),
    path('reports/payment-summary/', LabourViewSet.as_view({'get': 'payment_summary'}), name='labour-report-payment-summary'),
    path('reports/payment-summary/export/', LabourViewSet.as_view({'get': 'export_payment_summary'}), name='labour-report-payment-summary-export'),
    path('reports/payment-summary/pdf/', LabourViewSet.as_view({'get': 'export_payment_summary_pdf'}), name='labour-report-payment-summary-pdf'),
    path('attendance/', LabourAttendanceViewSet.as_view({'get': 'list', 'post': 'create'}), name='labourattendance-list'),
    path('attendance/<int:pk>/', LabourAttendanceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='labourattendance-detail'),
    path('payments/', LabourPaymentViewSet.as_view({'get': 'list', 'post': 'create'}), name='labourpayment-list'),
    path('payments/<int:pk>/', LabourPaymentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='labourpayment-detail'),
    path('', include(router.urls)),
]