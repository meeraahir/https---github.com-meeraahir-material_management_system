from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.db.models.functions import Lower
from django.utils import timezone
from sites.models import Site


# Create your models here.
class Material(models.Model):
    UNIT_CHOICES = [
        ('bag', 'Bag'),
        ('kg', 'Kilogram'),
        ('ton', 'Ton'),
        ('meter', 'Meter'),
        ('litre', 'Litre'),
        ('piece', 'Piece'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=255, unique=True)
    unit = models.CharField(max_length=50, choices=UNIT_CHOICES)

    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(Lower('name'), name='unique_material_name_ci'),
        ]

    def __str__(self):
        return self.name

    def clean(self):
        if not self.name or not self.name.strip():
            raise ValidationError({'name': 'Material name must not be blank.'})


class MaterialVariant(models.Model):
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='variants')
    label = models.CharField(max_length=100)
    size_mm = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    unit_weight = models.DecimalField(max_digits=14, decimal_places=3, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['material__name', 'size_mm', 'label']
        constraints = [
            models.UniqueConstraint(fields=['material', 'size_mm'], name='unique_material_variant_size'),
        ]

    def __str__(self):
        return f'{self.material.name} - {self.label}'

    def clean(self):
        errors = {}

        if not self.label or not self.label.strip():
            errors['label'] = 'Variant label must not be blank.'

        if self.size_mm is not None and self.size_mm <= 0:
            errors['size_mm'] = 'Size in mm must be greater than zero.'

        if self.unit_weight is not None and self.unit_weight <= 0:
            errors['unit_weight'] = 'Unit weight must be greater than zero.'

        if errors:
            raise ValidationError(errors)


class MaterialVariantPrice(models.Model):
    variant = models.ForeignKey(MaterialVariant, on_delete=models.CASCADE, related_name='daily_prices')
    date = models.DateField(default=timezone.now)
    price_per_unit = models.DecimalField(max_digits=14, decimal_places=2)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-date', 'variant__material__name', 'variant__size_mm', 'variant__label']
        constraints = [
            models.UniqueConstraint(fields=['variant', 'date'], name='unique_variant_price_per_day'),
        ]

    def __str__(self):
        return f'{self.variant} @ {self.price_per_unit} on {self.date}'

    def clean(self):
        errors = {}

        if self.price_per_unit < 0:
            errors['price_per_unit'] = 'Price per unit must be zero or positive.'

        if errors:
            raise ValidationError(errors)


class MaterialStock(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    material = models.ForeignKey(Material, on_delete=models.CASCADE)
    material_variant = models.ForeignKey(
        MaterialVariant,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='stock_entries',
    )

    quantity_received = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal('0'))
    quantity_used = models.DecimalField(max_digits=14, decimal_places=3, default=Decimal('0'))

    cost_per_unit = models.DecimalField(max_digits=14, decimal_places=2)
    transport_cost = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    invoice_number = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    date = models.DateField(default=timezone.now)

    def total_cost(self):
        return (self.quantity_received * self.cost_per_unit) + self.transport_cost

    def remaining_stock(self):
        return self.quantity_received - self.quantity_used

    def _matching_stock_queryset(self):
        queryset = MaterialStock.objects.filter(material=self.material)
        if self.material_variant_id:
            queryset = queryset.filter(material_variant_id=self.material_variant_id)
        else:
            queryset = queryset.filter(material_variant__isnull=True)
        return queryset

    def _site_totals_before(self):
        queryset = self._matching_stock_queryset().filter(site=self.site)
        if self.pk:
            queryset = queryset.exclude(pk=self.pk)

        totals = queryset.aggregate(
            total_received=Sum('quantity_received'),
            total_used=Sum('quantity_used'),
        )
        return totals['total_received'] or 0, totals['total_used'] or 0

    def _material_totals_before(self):
        queryset = self._matching_stock_queryset()
        if self.pk:
            queryset = queryset.exclude(pk=self.pk)

        totals = queryset.aggregate(
            total_received=Sum('quantity_received'),
            total_used=Sum('quantity_used'),
        )
        return totals['total_received'] or 0, totals['total_used'] or 0

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        if self.quantity_received < 0:
            errors['quantity_received'] = 'Received quantity must be zero or positive.'

        if self.quantity_used < 0:
            errors['quantity_used'] = 'Used quantity must be zero or positive.'

        if self.cost_per_unit < 0:
            errors['cost_per_unit'] = 'Cost per unit must be zero or positive.'

        if self.transport_cost < 0:
            errors['transport_cost'] = 'Transport cost must be zero or positive.'

        if self.material_variant_id and self.material_variant.material_id != self.material_id:
            errors['material_variant'] = 'Selected material variant must belong to the selected material.'

        if self.site and self.material:
            site_received_before, site_used_before = self._site_totals_before()
            available_before = site_received_before - site_used_before
            maximum_usable = available_before + self.quantity_received
            if self.quantity_used > maximum_usable:
                errors['quantity_used'] = (
                    'Site-level material not available: quantity used exceeds available stock for this site and material. '
                    f'Available before transaction: {available_before}, received: {self.quantity_received}, '
                    f'maximum usable: {maximum_usable}.'
                )

        if self.material:
            overall_received_before, overall_used_before = self._material_totals_before()
            overall_received_after = overall_received_before + self.quantity_received
            overall_used_after = overall_used_before + self.quantity_used
            if overall_used_after > overall_received_after:
                message = (
                    'Overall material not available: total used would exceed total received across all sites. '
                    f'Total received before: {overall_received_before}, total used before: {overall_used_before}, '
                    f'received in this record: {self.quantity_received}, used in this record: {self.quantity_used}.'
                )
                if 'quantity_used' in errors:
                    errors['quantity_used'] += f' Also {message}'
                else:
                    errors['quantity_used'] = message

        if errors:
            raise ValidationError(errors)


class MaterialUsage(models.Model):
    receipt = models.ForeignKey(MaterialStock, on_delete=models.CASCADE, related_name='usage_entries')
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    material = models.ForeignKey(Material, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=14, decimal_places=3)
    date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['date', 'id']

    def __str__(self):
        return f'{self.material.name} usage at {self.site.name} on {self.date}'

    def _sync_receipt_quantity_used(self):
        if not self.receipt_id:
            return
        total_used = self.receipt.usage_entries.aggregate(total=Sum('quantity'))['total'] or Decimal('0')
        MaterialStock.objects.filter(pk=self.receipt_id).update(quantity_used=total_used)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self._sync_receipt_quantity_used()

    def delete(self, *args, **kwargs):
        receipt_id = self.receipt_id
        super().delete(*args, **kwargs)
        if receipt_id:
            total_used = MaterialUsage.objects.filter(receipt_id=receipt_id).aggregate(total=Sum('quantity'))['total'] or Decimal('0')
            MaterialStock.objects.filter(pk=receipt_id).update(quantity_used=total_used)

    def clean(self):
        errors = {}

        if self.quantity <= 0:
            errors['quantity'] = 'Used quantity must be greater than zero.'

        if self.receipt_id is None:
            errors['receipt'] = 'Receipt must be provided.'

        if self.receipt_id:
            if self.site_id != self.receipt.site_id:
                errors['site'] = 'Usage site must match the receipt site.'
            if self.material_id != self.receipt.material_id:
                errors['material'] = 'Usage material must match the receipt material.'
            if self.date and self.receipt.date and self.date < self.receipt.date:
                errors['date'] = 'Usage date cannot be earlier than the receipt date.'

            existing_total = self.receipt.usage_entries.exclude(pk=self.pk).aggregate(total=Sum('quantity'))['total'] or 0
            if existing_total + self.quantity > self.receipt.quantity_received:
                errors['quantity'] = 'Used quantity cannot exceed the received quantity for this receipt.'

        if errors:
            raise ValidationError(errors)
