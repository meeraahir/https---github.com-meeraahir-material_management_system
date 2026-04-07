from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PartyViewSet, TransactionViewSet

app_name = 'finance'

router = DefaultRouter()
router.register(r'parties', PartyViewSet)
router.register(r'transactions', TransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]