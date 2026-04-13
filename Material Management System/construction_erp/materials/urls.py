from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MaterialViewSet,
    MaterialStockViewSet,
    MaterialUsageViewSet,
    MaterialVariantViewSet,
    MaterialVariantPriceViewSet,
)

app_name = 'materials'

router = DefaultRouter()
router.register(r'materials', MaterialViewSet)
router.register(r'variants', MaterialVariantViewSet)
router.register(r'variant-prices', MaterialVariantPriceViewSet)
router.register(r'stocks', MaterialStockViewSet)
router.register(r'usages', MaterialUsageViewSet)

urlpatterns = [
    # Clean aliases for frontend integration.
    path('', MaterialViewSet.as_view({'get': 'list', 'post': 'create'}), name='material-list'),
    path('<int:pk>/', MaterialViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='material-detail'),
    path('variants/', MaterialVariantViewSet.as_view({'get': 'list', 'post': 'create'}), name='materialvariant-list'),
    path('variants/<int:pk>/', MaterialVariantViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='materialvariant-detail'),
    path('variant-prices/', MaterialVariantPriceViewSet.as_view({'get': 'list', 'post': 'create'}), name='materialvariantprice-list'),
    path('variant-prices/<int:pk>/', MaterialVariantPriceViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='materialvariantprice-detail'),
    path('stocks/', MaterialStockViewSet.as_view({'get': 'list', 'post': 'create'}), name='materialstock-list'),
    path('stocks/<int:pk>/', MaterialStockViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='materialstock-detail'),
    path('usages/', MaterialUsageViewSet.as_view({'get': 'list', 'post': 'create'}), name='materialusage-list'),
    path('usages/<int:pk>/', MaterialUsageViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='materialusage-detail'),
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
