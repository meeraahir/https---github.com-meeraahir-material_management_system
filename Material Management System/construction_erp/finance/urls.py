from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PartyViewSet, TransactionViewSet

app_name = 'finance'

router = DefaultRouter()
router.register(r'parties', PartyViewSet)
router.register(r'transactions', TransactionViewSet)

urlpatterns = [
    path('', PartyViewSet.as_view({'get': 'list', 'post': 'create'}), name='party-list'),
    path('<int:pk>/', PartyViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='party-detail'),
    path('<int:pk>/ledger/', PartyViewSet.as_view({'get': 'ledger'}), name='party-ledger'),
    path('<int:pk>/ledger/export/', PartyViewSet.as_view({'get': 'export_ledger'}), name='party-ledger-export'),
    path('<int:pk>/ledger/pdf/', PartyViewSet.as_view({'get': 'export_ledger_pdf'}), name='party-ledger-pdf'),
    path('reports/receivables/', PartyViewSet.as_view({'get': 'receivables_report'}), name='finance-report-receivables'),
    path('reports/receivables/export/', PartyViewSet.as_view({'get': 'export_receivables_report'}), name='finance-report-receivables-export'),
    path('reports/receivables/pdf/', PartyViewSet.as_view({'get': 'export_receivables_report_pdf'}), name='finance-report-receivables-pdf'),
    path('reports/site-wise/', PartyViewSet.as_view({'get': 'site_wise_report'}), name='finance-report-site-wise'),
    path('reports/site-wise/export/', PartyViewSet.as_view({'get': 'export_site_wise_report'}), name='finance-report-site-wise-export'),
    path('reports/site-wise/pdf/', PartyViewSet.as_view({'get': 'export_site_wise_report_pdf'}), name='finance-report-site-wise-pdf'),
    path('reports/site/<int:site_id>/', PartyViewSet.as_view({'get': 'site_specific_report'}), name='finance-report-site-specific'),
    path('reports/site/<int:site_id>/export/', PartyViewSet.as_view({'get': 'export_site_specific_report'}), name='finance-report-site-specific-export'),
    path('reports/site/<int:site_id>/pdf/', PartyViewSet.as_view({'get': 'export_site_specific_report_pdf'}), name='finance-report-site-specific-pdf'),
    path('transactions/', TransactionViewSet.as_view({'get': 'list', 'post': 'create'}), name='transaction-list'),
    path('transactions/<int:pk>/', TransactionViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='transaction-detail'),
    path('transactions/<int:pk>/receive-payment/', TransactionViewSet.as_view({'post': 'receive_payment'}), name='transaction-receive-payment'),
    path('', include(router.urls)),
]
