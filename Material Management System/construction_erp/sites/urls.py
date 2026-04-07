from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SiteViewSet

app_name = 'sites'

router = DefaultRouter()
router.register(r'', SiteViewSet)

urlpatterns = [
    path('', include(router.urls)),
]