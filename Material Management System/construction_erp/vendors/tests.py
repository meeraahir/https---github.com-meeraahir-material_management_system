from django.test import TestCase

from sites.models import Site

from .models import Vendor, VendorTransaction
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
        self.assertEqual(data['payment_mode'], 'cash')
