from django.core.exceptions import ValidationError
from django.test import TestCase

from sites.models import Site
from .models import Material, MaterialStock


class MaterialStockValidationTests(TestCase):
    def setUp(self):
        self.site1 = Site.objects.create(name='Site A', location='Location A')
        self.site2 = Site.objects.create(name='Site B', location='Location B')
        self.material = Material.objects.create(name='Cement', unit='bags')

    def test_site_specific_usage_exceeds_site_stock(self):
        MaterialStock.objects.create(
            site=self.site1,
            material=self.material,
            quantity_received=100,
            quantity_used=100,
            cost_per_unit=10,
            transport_cost=0,
        )

        with self.assertRaises(ValidationError) as cm:
            MaterialStock.objects.create(
                site=self.site2,
                material=self.material,
                quantity_received=0,
                quantity_used=100,
                cost_per_unit=10,
                transport_cost=0,
            )

        self.assertIn('quantity_used', cm.exception.message_dict)

    def test_global_usage_exceeds_total_received(self):
        MaterialStock.objects.create(
            site=self.site1,
            material=self.material,
            quantity_received=100,
            quantity_used=50,
            cost_per_unit=10,
            transport_cost=0,
        )

        with self.assertRaises(ValidationError) as cm:
            MaterialStock.objects.create(
                site=self.site2,
                material=self.material,
                quantity_received=0,
                quantity_used=60,
                cost_per_unit=10,
                transport_cost=0,
            )

        self.assertIn('quantity_used', cm.exception.message_dict)

    def test_direct_save_always_validates(self):
        stock = MaterialStock(
            site=self.site1,
            material=self.material,
            quantity_received=0,
            quantity_used=100,
            cost_per_unit=10,
            transport_cost=0,
        )

        with self.assertRaises(ValidationError):
            stock.save()
