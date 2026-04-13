from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import EmailOrUsernameLoginView
from .views import (
    DashboardChartView,
    DashboardExportView,
    DashboardPDFView,
    DashboardView,
    OwnerDashboardView,
    PersonalAdminDashboardView,
)

urlpatterns = [
    path('token/', EmailOrUsernameLoginView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('dashboard/owner/', OwnerDashboardView.as_view(), name='owner-dashboard'),
    path('dashboard/personal-admin/', PersonalAdminDashboardView.as_view(), name='personal-admin-dashboard'),
    path('dashboard/chart/', DashboardChartView.as_view(), name='dashboard-chart'),
    path('dashboard/export/', DashboardExportView.as_view(), name='dashboard-export'),
    path('dashboard/export/pdf/', DashboardPDFView.as_view(), name='dashboard-export-pdf'),
]
