from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendorViewSet, VendorTransactionViewSet

app_name = 'vendors'

router = DefaultRouter()
router.register(r'vendors', VendorViewSet)
router.register(r'transactions', VendorTransactionViewSet)

urlpatterns = [
    # Clean aliases for frontend integration.
    path('', VendorViewSet.as_view({'get': 'list', 'post': 'create'}), name='vendor-list'),
    path('<int:pk>/', VendorViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='vendor-detail'),
    path('<int:pk>/ledger/', VendorViewSet.as_view({'get': 'ledger'}), name='vendor-ledger'),
    path('<int:pk>/ledger/export/', VendorViewSet.as_view({'get': 'export_ledger'}), name='vendor-ledger-export'),
    path('<int:pk>/ledger/pdf/', VendorViewSet.as_view({'get': 'export_ledger_pdf'}), name='vendor-ledger-pdf'),
    path('reports/pending/', VendorViewSet.as_view({'get': 'pending_transactions'}), name='vendor-report-pending'),
    path('reports/pending/export/', VendorViewSet.as_view({'get': 'export_pending'}), name='vendor-report-pending-export'),
    path('reports/pending/pdf/', VendorViewSet.as_view({'get': 'export_pending_pdf'}), name='vendor-report-pending-pdf'),
    path('reports/summary/', VendorViewSet.as_view({'get': 'summary_report'}), name='vendor-report-summary'),
    path('reports/summary/export/', VendorViewSet.as_view({'get': 'export_summary'}), name='vendor-report-summary-export'),
    path('reports/summary/pdf/', VendorViewSet.as_view({'get': 'export_summary_pdf'}), name='vendor-report-summary-pdf'),
    path('reports/site-wise/', VendorViewSet.as_view({'get': 'site_wise_report'}), name='vendor-report-site-wise'),
    path('reports/site-wise/export/', VendorViewSet.as_view({'get': 'export_site_wise_report'}), name='vendor-report-site-wise-export'),
    path('reports/site-wise/pdf/', VendorViewSet.as_view({'get': 'export_site_wise_report_pdf'}), name='vendor-report-site-wise-pdf'),
    path('reports/site/<int:site_id>/', VendorViewSet.as_view({'get': 'site_specific_report'}), name='vendor-report-site-specific'),
    path('reports/site/<int:site_id>/export/', VendorViewSet.as_view({'get': 'export_site_specific_report'}), name='vendor-report-site-specific-export'),
    path('reports/site/<int:site_id>/pdf/', VendorViewSet.as_view({'get': 'export_site_specific_report_pdf'}), name='vendor-report-site-specific-pdf'),
    path('transactions/', VendorTransactionViewSet.as_view({'get': 'list', 'post': 'create'}), name='vendortransaction-list'),
    path('transactions/<int:pk>/', VendorTransactionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='vendortransaction-detail'),
    path('', include(router.urls)),
]
