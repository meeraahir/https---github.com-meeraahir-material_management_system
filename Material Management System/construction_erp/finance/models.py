from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from sites.models import Site

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

        if errors:
            raise ValidationError(errors)
