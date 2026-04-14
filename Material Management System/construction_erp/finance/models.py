from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from core.payment_details import (
    PAYMENT_MODE_BANK_TRANSFER,
    PAYMENT_MODE_CASH,
    PAYMENT_MODE_CHECK,
    PAYMENT_MODE_CHOICES,
    PAYMENT_MODE_OTHER,
    PAYMENT_MODE_UPI,
    normalize_optional_text,
    validate_payment_details,
)
from sites.models import Site
from labour.models import Labour

# Create your models here.
class Party(models.Model):
    name = models.CharField(max_length=255)
    contact = models.CharField(max_length=15)

    def __str__(self):
        return self.name


class Transaction(models.Model):
    party = models.ForeignKey(Party, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.CASCADE)

    amount = models.DecimalField(max_digits=14, decimal_places=2)
    received = models.BooleanField(default=False)

    date = models.DateField(default=timezone.now)
    phase_name = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    


    def receipts_total(self):
        return self.receipts.aggregate(total=Sum('amount'))['total'] or 0

    def pending_amount(self):
        return self.amount - self.receipts_total()

    def sync_received_status(self, save=True):
        self.received = self.pending_amount() <= 0
        if save:
            super().save(update_fields=['received'])
        return self.received

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        if self.amount < 0:
            errors['amount'] = 'Amount must be zero or positive.'

        existing_receipts = self.receipts_total() if self.pk else 0
        if self.amount < existing_receipts:
            errors['amount'] = 'Amount cannot be less than the amount already received against this invoice.'

        if errors:
            raise ValidationError(errors)


class ClientReceipt(models.Model):
    invoice = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='receipts')
    party = models.ForeignKey(Party, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.now)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default=PAYMENT_MODE_CASH)
    sender_name = models.CharField(max_length=255, blank=True, null=True)
    receiver_name = models.CharField(max_length=255, blank=True, null=True)
    cheque_number = models.CharField(max_length=50, blank=True, null=True)
    reference_number = models.CharField(max_length=50, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['date', 'id']

    def __str__(self):
        return f'{self.party.name} receipt {self.amount} on {self.date}'

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}
        self.reference_number = normalize_optional_text(self.reference_number)
        self.sender_name = normalize_optional_text(self.sender_name)
        self.receiver_name = normalize_optional_text(self.receiver_name)
        self.cheque_number = normalize_optional_text(self.cheque_number)

        if self.amount <= 0:
            errors['amount'] = 'Receipt amount must be greater than zero.'

        if self.invoice_id:
            if self.party_id != self.invoice.party_id:
                errors['party'] = 'Receipt party must match the invoice party.'
            if self.site_id != self.invoice.site_id:
                errors['site'] = 'Receipt site must match the invoice site.'

            existing_total = self.invoice.receipts.exclude(pk=self.pk).aggregate(total=Sum('amount'))['total'] or 0
            if existing_total + self.amount > self.invoice.amount:
                errors['amount'] = 'Receipt amount cannot exceed the pending amount for this invoice.'

        payment_details = validate_payment_details(
            payment_mode=self.payment_mode,
            sender_name=self.sender_name,
            receiver_name=self.receiver_name,
            cheque_number=self.cheque_number,
            default_sender_name=self.party.name if self.party_id else None,
        )
        self.sender_name = payment_details['sender_name']
        self.receiver_name = payment_details['receiver_name']
        self.cheque_number = payment_details['cheque_number']
        errors.update(payment_details['errors'])

        if errors:
            raise ValidationError(errors)


class MiscellaneousExpense(models.Model):
    title = models.CharField(max_length=255)
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True)
    labour = models.ForeignKey(Labour, on_delete=models.SET_NULL, null=True, blank=True)
    paid_to_name = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.now)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default=PAYMENT_MODE_CASH)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        return f'{self.title} - {self.amount} on {self.date}'

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}
        self.paid_to_name = normalize_optional_text(self.paid_to_name)

        if not self.title or not self.title.strip():
            errors['title'] = 'Expense title is required.'

        if self.amount is None:
            errors['amount'] = 'Expense amount is required.'
        elif self.amount <= 0:
            errors['amount'] = 'Expense amount must be greater than zero.'

        if self.labour_id and not self.paid_to_name:
            self.paid_to_name = self.labour.name

        if errors:
            raise ValidationError(errors)


class OwnerPayout(models.Model):
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.now)
    payment_mode = models.CharField(max_length=20, choices=PAYMENT_MODE_CHOICES, default=PAYMENT_MODE_CASH)
    sender_name = models.CharField(max_length=255, blank=True, null=True)
    receiver_name = models.CharField(max_length=255, blank=True, null=True)
    cheque_number = models.CharField(max_length=50, blank=True, null=True)
    reference_number = models.CharField(max_length=50, blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-date', '-id']

    def __str__(self):
        label = self.receiver_name or self.sender_name or 'Owner payout'
        return f'{label} - {self.amount} on {self.date}'

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}
        self.reference_number = normalize_optional_text(self.reference_number)
        self.sender_name = normalize_optional_text(self.sender_name)
        self.receiver_name = normalize_optional_text(self.receiver_name)
        self.cheque_number = normalize_optional_text(self.cheque_number)

        if self.amount is None:
            errors['amount'] = 'Payment amount is required.'
        elif self.amount <= 0:
            errors['amount'] = 'Payment amount must be greater than zero.'

        payment_details = validate_payment_details(
            payment_mode=self.payment_mode,
            sender_name=self.sender_name,
            receiver_name=self.receiver_name,
            cheque_number=self.cheque_number,
        )
        self.sender_name = payment_details['sender_name']
        self.receiver_name = payment_details['receiver_name']
        self.cheque_number = payment_details['cheque_number']
        errors.update(payment_details['errors'])

        if errors:
            raise ValidationError(errors)
