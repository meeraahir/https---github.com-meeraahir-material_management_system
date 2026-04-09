from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from sites.models import Site
from materials.models import Material

phone_validator = RegexValidator(
    regex=r'^\+?\d{7,15}$',
    message='Enter a valid phone number with 7 to 15 digits, optionally starting with +.'
)

account_validator = RegexValidator(
    regex=r'^\d{6,30}$',
    message='Enter a valid bank account number with 6 to 30 digits.',
)

ifsc_validator = RegexValidator(
    regex=r'^[A-Z]{4}0[A-Z0-9]{6}$',
    message='Enter a valid IFSC code in the format BBBB0CCCCCC.',
)

pan_validator = RegexValidator(
    regex=r'^[A-Z]{5}[0-9]{4}[A-Z]{1}$',
    message='Enter a valid PAN number in the format AAAAA9999A (e.g., ABCDE1234F).',
)

aadhar_validator = RegexValidator(
    regex=r'^\d{12}$',
    message='Enter a valid Aadhar number with 12 digits.',
)

# Create your models here.
class Vendor(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=15, validators=[phone_validator])
    email = models.EmailField(blank=True, null=True)
    address = models.TextField()
    bank_name = models.CharField(max_length=255, blank=True, null=True)
    bank_account_number = models.CharField(max_length=30, blank=True, null=True, validators=[account_validator])
    ifsc_code = models.CharField(max_length=11, blank=True, null=True, validators=[ifsc_validator])
    tax_identifier = models.CharField(max_length=50, blank=True, null=True)
    license_number = models.CharField(max_length=50, blank=True, null=True)
    document_details = models.TextField(blank=True, null=True)
    pan_number = models.CharField(max_length=10, blank=True, null=True, validators=[pan_validator])
    aadhar_number = models.CharField(max_length=12, blank=True, null=True, validators=[aadhar_validator])

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}
        if not self.name or not self.name.strip():
            errors['name'] = 'Vendor name is required.'
        if not self.address or not self.address.strip():
            errors['address'] = 'Address is required.'

        if self.bank_account_number and not self.bank_name:
            errors['bank_name'] = 'Bank name is required when a bank account number is provided.'
        if self.ifsc_code and not self.bank_name:
            errors['bank_name'] = 'Bank name is required when IFSC code is provided.'

        if errors:
            raise ValidationError(errors)


class VendorTransaction(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    material = models.ForeignKey(Material, on_delete=models.SET_NULL, null=True, blank=True)
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    invoice_number = models.CharField(max_length=50, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    date = models.DateField(default=timezone.now)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.vendor.name} - {self.material.name if self.material else "Purchase"} on {self.date}'

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def payments_total(self):
        return self.payments.aggregate(total=Sum('amount'))['total'] or 0

    def refresh_paid_amount(self, save=True):
        self.paid_amount = self.payments_total()
        if save:
            super().save(update_fields=['paid_amount'])
        return self.paid_amount

    def pending_amount(self):
        return self.total_amount - self.paid_amount

    def clean(self):
        errors = {}

        if self.total_amount < 0:
            errors['total_amount'] = 'Total amount must be zero or positive.'
        if self.paid_amount < 0:
            errors['paid_amount'] = 'Paid amount must be zero or positive.'
        existing_paid_amount = self.payments_total() if self.pk else 0
        if self.paid_amount < existing_paid_amount:
            errors['paid_amount'] = 'Paid amount cannot be reduced below the amount already recorded in payment history.'
        if self.paid_amount > self.total_amount:
            errors['paid_amount'] = 'Paid amount cannot exceed total amount.'
        if self.vendor_id is None:
            errors['vendor'] = 'Vendor must be provided.'
        if self.site_id is None:
            errors['site'] = 'Site must be provided.'

        if errors:
            raise ValidationError(errors)


class VendorPayment(models.Model):
    purchase = models.ForeignKey(VendorTransaction, on_delete=models.CASCADE, related_name='payments')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.now)
    reference_number = models.CharField(max_length=50, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['date', 'id']

    def __str__(self):
        return f'{self.vendor.name} payment {self.amount} on {self.date}'

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        if self.amount <= 0:
            errors['amount'] = 'Payment amount must be greater than zero.'

        if self.purchase_id:
            if self.vendor_id != self.purchase.vendor_id:
                errors['vendor'] = 'Payment vendor must match the purchase vendor.'
            if self.site_id != self.purchase.site_id:
                errors['site'] = 'Payment site must match the purchase site.'

            existing_total = self.purchase.payments.exclude(pk=self.pk).aggregate(total=Sum('amount'))['total'] or 0
            if existing_total + self.amount > self.purchase.total_amount:
                errors['amount'] = 'Payment amount cannot exceed the remaining amount for this purchase.'

        if errors:
            raise ValidationError(errors)
