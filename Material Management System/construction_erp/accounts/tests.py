from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from sites.models import Site


class AccountsAndPermissionsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = get_user_model().objects.create_user(
            username='admin_user',
            email='admin@test.com',
            password='Password123!',
            role='admin',
        )
        self.manager = get_user_model().objects.create_user(
            username='manager_user',
            email='manager@test.com',
            password='Password123!',
            role='manager',
        )
        self.staff = get_user_model().objects.create_user(
            username='staff_user',
            email='staff@test.com',
            password='Password123!',
            role='staff',
        )
        self.viewer = get_user_model().objects.create_user(
            username='viewer_user',
            email='viewer@test.com',
            password='Password123!',
            role='viewer',
        )

    def test_register_supports_explicit_role(self):
        response = self.client.post('/api/accounts/register/', {
            'username': 'new_viewer',
            'email': 'new_viewer@test.com',
            'first_name': 'New',
            'last_name': 'Viewer',
            'role': 'viewer',
            'password': 'Password123!',
            'password2': 'Password123!',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['user']['role'], 'viewer')

    def test_viewer_is_read_only(self):
        self.client.force_authenticate(user=self.viewer)
        response = self.client.post('/api/vendors/', {
            'name': 'Blocked Vendor',
            'phone': '+1234567890',
            'address': 'No write access',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_can_create_but_not_delete(self):
        self.client.force_authenticate(user=self.staff)
        create_response = self.client.post('/api/vendors/', {
            'name': 'Allowed Vendor',
            'phone': '+1234567890',
            'address': 'Write allowed',
        }, format='json')

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        site = Site.objects.create(name='Delete Test Site', location='Delete City')
        delete_response = self.client.delete(f'/api/sites/{site.id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_manager_can_delete(self):
        site = Site.objects.create(name='Managed Site', location='Managed City')
        self.client.force_authenticate(user=self.manager)

        response = self.client.delete(f'/api/sites/{site.id}/')
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
