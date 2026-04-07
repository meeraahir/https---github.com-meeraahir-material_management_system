from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MaterialViewSet, MaterialStockViewSet

app_name = 'materials'

router = DefaultRouter()
router.register(r'materials', MaterialViewSet)
router.register(r'stocks', MaterialStockViewSet)

urlpatterns = [
    # Clean aliases for frontend integration.
    path('', MaterialViewSet.as_view({'get': 'list', 'post': 'create'}), name='material-list'),
    path('<int:pk>/', MaterialViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='material-detail'),
    path('stocks/', MaterialStockViewSet.as_view({'get': 'list', 'post': 'create'}), name='materialstock-list'),
    path('stocks/<int:pk>/', MaterialStockViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='materialstock-detail'),
    path('reports/material-wise/', MaterialStockViewSet.as_view({'get': 'material_wise_report'}), name='material-report-material-wise'),
    path('reports/material-wise/export/', MaterialStockViewSet.as_view({'get': 'export_material_report'}), name='material-report-material-wise-export'),
    path('reports/material-wise/pdf/', MaterialStockViewSet.as_view({'get': 'export_material_report_pdf'}), name='material-report-material-wise-pdf'),
    path('reports/site-wise/', MaterialStockViewSet.as_view({'get': 'site_wise_report'}), name='material-report-site-wise'),
    path('reports/site-wise/export/', MaterialStockViewSet.as_view({'get': 'export_site_report'}), name='material-report-site-wise-export'),
    path('reports/site-wise/pdf/', MaterialStockViewSet.as_view({'get': 'export_site_report_pdf'}), name='material-report-site-wise-pdf'),
    path('reports/site/<int:site_id>/', MaterialStockViewSet.as_view({'get': 'site_specific_report'}), name='material-report-site-specific'),
    path('reports/site/<int:site_id>/export/', MaterialStockViewSet.as_view({'get': 'export_site_specific_report'}), name='material-report-site-specific-export'),
    path('reports/site/<int:site_id>/pdf/', MaterialStockViewSet.as_view({'get': 'export_site_specific_report_pdf'}), name='material-report-site-specific-pdf'),
    path('chart/material-wise/', MaterialStockViewSet.as_view({'get': 'chart_material_wise'}), name='material-chart-material-wise'),
    path('chart/site-wise/', MaterialStockViewSet.as_view({'get': 'chart_site_wise'}), name='material-chart-site-wise'),
    path('', include(router.urls)),
]