from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import EmailOrUsernameLoginView, ForgotPasswordView, RegisterView, UserDetailView

urlpatterns = [
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', EmailOrUsernameLoginView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserDetailView.as_view(), name='user_profile'),
]
