from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import DashboardView, DashboardChartView, DashboardExportView, DashboardPDFView

urlpatterns = [
    path('token/', TokenObtainPairView.as_view()),
    path('token/refresh/', TokenRefreshView.as_view()),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('dashboard/chart/', DashboardChartView.as_view(), name='dashboard-chart'),
    path('dashboard/export/', DashboardExportView.as_view(), name='dashboard-export'),
    path('dashboard/export/pdf/', DashboardPDFView.as_view(), name='dashboard-export-pdf'),
]