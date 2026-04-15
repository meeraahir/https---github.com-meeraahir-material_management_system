from django.test import TestCase

from sites.models import Site

from .models import Vendor, VendorPayment, VendorTransaction
from .serializers import VendorTransactionSerializer


class VendorTransactionSerializerTests(TestCase):
    def test_payment_mode_is_included_in_read_serializer_output(self):
        site = Site.objects.create(name='Serializer Site', location='Ahmedabad')
        vendor = Vendor.objects.create(
            name='Serializer Vendor',
            phone='+919999999999',
            address='Serializer Address',
        )
        purchase = VendorTransaction.objects.create(
            vendor=vendor,
            site=site,
            total_amount='1000.00',
            paid_amount='0.00',
        )

        data = VendorTransactionSerializer(purchase).data

        self.assertIn('payment_mode', data)
        self.assertIsNone(data['payment_mode'])

    def test_payment_mode_comes_from_related_payment_history(self):
        site = Site.objects.create(name='Payment Site', location='Ahmedabad')
        vendor = Vendor.objects.create(
            name='Payment Vendor',
            phone='+919999999998',
            address='Payment Address',
        )
        purchase = VendorTransaction.objects.create(
            vendor=vendor,
            site=site,
            total_amount='1000.00',
            paid_amount='0.00',
        )
        VendorPayment.objects.create(
            purchase=purchase,
            vendor=vendor,
            site=site,
            amount='250.00',
            payment_mode='upi',
        )

        data = VendorTransactionSerializer(purchase).data

        self.assertEqual(data['payment_mode'], 'upi')
