from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from materials.models import Material
from sites.models import Site
from .models import Vendor, VendorPayment, VendorTransaction
from .serializers import VendorTransactionSerializer


class VendorModuleTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='vendor_test_user',
            email='vendor@test.com',
            password='password123',
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.site = Site.objects.create(name='Demo Site', location='Test Location')
        self.material = Material.objects.create(name='Cement', unit='bag')
        self.vendor = Vendor.objects.create(name='Test Vendor', phone='+1234567890', address='Test address')

    def test_transaction_validation_rejects_negative_values_and_overpayment(self):
        serializer = VendorTransactionSerializer(data={
            'vendor': self.vendor.id,
            'site': self.site.id,
            'material': self.material.id,
            'total_amount': -100,
            'paid_amount': 120,
            'date': date.today(),
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('total_amount', serializer.errors)
        self.assertIn('paid_amount', serializer.errors)

    def test_vendor_ledger_filters_by_date_range(self):
        VendorTransaction.objects.create(
            vendor=self.vendor,
            site=self.site,
            material=self.material,
            total_amount=1000,
            paid_amount=400,
            date=date.today() - timedelta(days=10),
        )
        VendorTransaction.objects.create(
            vendor=self.vendor,
            site=self.site,
            material=self.material,
            total_amount=500,
            paid_amount=500,
            date=date.today(),
        )

        start_date = (date.today() - timedelta(days=5)).isoformat()
        response = self.client.get(f'/api/vendors/vendors/{self.vendor.id}/ledger/?date_from={start_date}')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transactions = response.data['transactions']
        self.assertEqual(len(transactions), 1)
        self.assertEqual(transactions[0]['debit'], 500)

    def test_vendor_ledger_pdf_export_returns_pdf(self):
        VendorTransaction.objects.create(
            vendor=self.vendor,
            site=self.site,
            material=self.material,
            total_amount=700,
            paid_amount=300,
            date=date.today(),
        )

        response = self.client.get(f'/api/vendors/vendors/{self.vendor.id}/ledger/pdf/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')

    def test_site_reports_are_available(self):
        second_site = Site.objects.create(name='Secondary Site', location='Another Location')
        VendorTransaction.objects.create(
            vendor=self.vendor,
            site=self.site,
            material=self.material,
            total_amount=1000,
            paid_amount=400,
            date=date.today(),
        )
        VendorTransaction.objects.create(
            vendor=self.vendor,
            site=second_site,
            material=self.material,
            total_amount=1500,
            paid_amount=500,
            date=date.today(),
        )

        site_wise = self.client.get('/api/vendors/reports/site-wise/')
        self.assertEqual(site_wise.status_code, status.HTTP_200_OK)
        self.assertEqual(len(site_wise.data), 2)

        site_specific = self.client.get(f'/api/vendors/reports/site/{self.site.id}/')
        self.assertEqual(site_specific.status_code, status.HTTP_200_OK)
        self.assertEqual(len(site_specific.data), 1)
        self.assertEqual(site_specific.data[0]['vendor_name'], self.vendor.name)
        self.assertEqual(site_specific.data[0]['pending_amount'], 600)

    def test_vendor_payment_api_records_payment_and_refreshes_purchase(self):
        purchase = VendorTransaction.objects.create(
            vendor=self.vendor,
            site=self.site,
            material=self.material,
            total_amount=1000,
            paid_amount=0,
            date=date.today(),
        )

        response = self.client.post('/api/vendors/payments/', {
            'purchase': purchase.id,
            'amount': '250.00',
            'date': date.today().isoformat(),
            'reference_number': 'UTR-001',
            'remarks': 'First partial payment',
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        purchase.refresh_from_db()
        self.assertEqual(purchase.paid_amount, 250)
        self.assertEqual(VendorPayment.objects.filter(purchase=purchase).count(), 1)
        self.assertEqual(response.data['vendor'], self.vendor.id)
        self.assertEqual(response.data['site'], self.site.id)

    def test_vendor_payment_api_rejects_overpayment(self):
        purchase = VendorTransaction.objects.create(
            vendor=self.vendor,
            site=self.site,
            material=self.material,
            total_amount=300,
            paid_amount=0,
            date=date.today(),
        )

        response = self.client.post('/api/vendors/payments/', {
            'purchase': purchase.id,
            'amount': '350.00',
            'date': date.today().isoformat(),
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('amount', response.data)
