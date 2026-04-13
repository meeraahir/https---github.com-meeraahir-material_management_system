from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from core.payment_details import PAYMENT_MODE_BANK_TRANSFER, PAYMENT_MODE_CASH
from finance.models import ClientReceipt, MiscellaneousExpense, Party, Transaction
from labour.models import CasualLabourEntry, Labour, LabourAttendance, LabourPayment, LabourPaymentEntry
from sites.models import Site
from vendors.models import Vendor, VendorPayment, VendorTransaction


class OwnerDashboardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='owner_user',
            email='owner@test.com',
            password='Password123!',
            role='admin',
        )
        self.client.force_authenticate(user=self.user)
        self.today = timezone.localdate()

    def _create_dashboard_dataset(self, cash_receipt_amount='600.00'):
        site_a = Site.objects.create(name='Alpha Site', location='Noida')
        site_b = Site.objects.create(name='Beta Site', location='Delhi')

        labour = Labour.objects.create(
            name='Raju',
            phone='9999999999',
            per_day_wage='500.00',
            labour_type='Mason',
        )
        LabourAttendance.objects.create(labour=labour, site=site_a, date=self.today, present=True)

        party = Party.objects.create(name='Client One', contact='8888888888')
        cash_invoice = Transaction.objects.create(
            party=party,
            site=site_a,
            amount='1000.00',
            date=self.today,
        )
        bank_invoice = Transaction.objects.create(
            party=party,
            site=site_b,
            amount='500.00',
            date=self.today,
        )
        ClientReceipt.objects.create(
            invoice=cash_invoice,
            party=party,
            site=site_a,
            amount=cash_receipt_amount,
            payment_mode=PAYMENT_MODE_CASH,
        )
        ClientReceipt.objects.create(
            invoice=bank_invoice,
            party=party,
            site=site_b,
            amount='100.00',
            payment_mode=PAYMENT_MODE_BANK_TRANSFER,
        )

        vendor = Vendor.objects.create(
            name='Vendor One',
            phone='+911234567890',
            address='Sector 1',
        )
        cash_purchase = VendorTransaction.objects.create(
            vendor=vendor,
            site=site_a,
            total_amount='500.00',
            date=self.today,
        )
        bank_purchase = VendorTransaction.objects.create(
            vendor=vendor,
            site=site_b,
            total_amount='300.00',
            date=self.today,
        )
        VendorPayment.objects.create(
            purchase=cash_purchase,
            vendor=vendor,
            site=site_a,
            amount='200.00',
            payment_mode=PAYMENT_MODE_CASH,
            date=self.today,
        )
        VendorPayment.objects.create(
            purchase=bank_purchase,
            vendor=vendor,
            site=site_b,
            amount='120.00',
            payment_mode=PAYMENT_MODE_BANK_TRANSFER,
            date=self.today,
        )

        wage_entry = LabourPayment.objects.create(
            labour=labour,
            site=site_a,
            total_amount='250.00',
            date=self.today,
            period_start=self.today,
            period_end=self.today,
        )
        LabourPaymentEntry.objects.create(
            payment=wage_entry,
            labour=labour,
            site=site_a,
            amount='100.00',
            date=self.today,
        )

        CasualLabourEntry.objects.create(
            labour_name='Temporary Worker',
            labour_type='Helper',
            site=site_a,
            date=self.today,
            paid_amount='50.00',
        )
        MiscellaneousExpense.objects.create(
            title='Tea Expense',
            site=site_a,
            amount='25.00',
            payment_mode=PAYMENT_MODE_CASH,
            date=self.today,
        )
        MiscellaneousExpense.objects.create(
            title='Diesel',
            site=site_b,
            amount='40.00',
            payment_mode=PAYMENT_MODE_BANK_TRANSFER,
            date=self.today,
        )

        return {
            'site_a': site_a,
            'site_b': site_b,
        }

    def test_owner_dashboard_returns_live_summary(self):
        dataset = self._create_dashboard_dataset()

        response = self.client.get('/api/core/dashboard/owner/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data['summary']
        self.assertEqual(summary['total_sites'], 2)
        self.assertEqual(summary['active_sites'], 1)
        self.assertEqual(summary['inactive_sites'], 1)
        self.assertEqual(Decimal(str(summary['payment_pending_from_clients'])), Decimal('800.00'))
        self.assertEqual(Decimal(str(summary['payment_pending_to_vendors'])), Decimal('480.00'))
        self.assertEqual(Decimal(str(summary['payment_pending_to_employees'])), Decimal('150.00'))
        self.assertEqual(Decimal(str(summary['total_cash_received'])), Decimal('600.00'))
        self.assertEqual(Decimal(str(summary['cash_paid_to_vendors'])), Decimal('200.00'))
        self.assertEqual(Decimal(str(summary['cash_paid_to_employees'])), Decimal('100.00'))
        self.assertEqual(Decimal(str(summary['cash_paid_to_casual_labour'])), Decimal('50.00'))
        self.assertEqual(Decimal(str(summary['cash_paid_for_miscellaneous_expenses'])), Decimal('25.00'))
        self.assertEqual(Decimal(str(summary['total_cash_outflow'])), Decimal('375.00'))
        self.assertEqual(Decimal(str(summary['cash_available'])), Decimal('225.00'))
        self.assertFalse(summary['has_negative_cash_balance'])
        self.assertEqual(response.data['notifications'], [])

        site_overview = {row['site_id']: row for row in response.data['site_overview']}
        self.assertTrue(site_overview[dataset['site_a'].id]['is_active'])
        self.assertFalse(site_overview[dataset['site_b'].id]['is_active'])

    def test_owner_dashboard_returns_negative_cash_notification(self):
        self._create_dashboard_dataset(cash_receipt_amount='200.00')

        response = self.client.get('/api/core/dashboard/owner/')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data['summary']
        self.assertTrue(summary['has_negative_cash_balance'])
        self.assertEqual(Decimal(str(summary['cash_available'])), Decimal('-175.00'))
        self.assertEqual(len(response.data['notifications']), 1)
        self.assertEqual(response.data['notifications'][0]['type'], 'negative_cash_balance')
        self.assertIn('-175.00', response.data['notifications'][0]['message'])

    def test_owner_dashboard_validates_date_format(self):
        response = self.client.get('/api/core/dashboard/owner/?date=13-04-2026')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['date'], 'Date must be in YYYY-MM-DD format.')
