from datetime import date as date_cls
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.utils import timezone
from sites.models import Site

# Create your models here.
class Labour(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=15)
    per_day_wage = models.DecimalField(max_digits=14, decimal_places=2)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        if not self.name or not self.name.strip():
            errors['name'] = 'Labour name is required.'

        if self.per_day_wage < 0:
            errors['per_day_wage'] = 'Per day wage must be zero or positive.'

        if errors:
            raise ValidationError(errors)


class LabourAttendance(models.Model):
    labour = models.ForeignKey(Labour, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.CASCADE)

    date = models.DateField()
    present = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['labour', 'site', 'date'], name='unique_labour_attendance_per_site_day'),
        ]

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        if self.labour_id is None:
            errors['labour'] = 'Labour must be provided.'
        if self.site_id is None:
            errors['site'] = 'Site must be provided.'
        if self.date is None:
            errors['date'] = 'Attendance date is required.'
        elif self.date > timezone.localdate():
            errors['date'] = 'Future attendance is not allowed.'

        if errors:
            raise ValidationError(errors)


class LabourPayment(models.Model):
    labour = models.ForeignKey(Labour, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True)

    total_amount = models.DecimalField(max_digits=14, decimal_places=2)
    paid_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    date = models.DateField(default=timezone.now)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    def pending_amount(self):
        return self.total_amount - self.paid_amount

    def attendance_queryset(self):
        queryset = LabourAttendance.objects.filter(labour=self.labour, present=True)
        if self.site_id:
            queryset = queryset.filter(site_id=self.site_id)

        start_date = self.period_start or self.date
        end_date = self.period_end or self.period_start or self.date

        if isinstance(start_date, str):
            start_date = date_cls.fromisoformat(start_date)
        if isinstance(end_date, str):
            end_date = date_cls.fromisoformat(end_date)

        if start_date:
            queryset = queryset.filter(date__gte=start_date)
        if end_date:
            queryset = queryset.filter(date__lte=end_date)
        return queryset

    def attendance_days(self):
        if not self.labour_id:
            return 0
        return self.attendance_queryset().count()

    def calculated_total_amount(self):
        if not self.labour_id:
            return Decimal('0')
        return (self.labour.per_day_wage or Decimal('0')) * self.attendance_days()

    def payments_total(self):
        return self.payment_entries.aggregate(total=Sum('amount'))['total'] or 0

    def refresh_paid_amount(self, save=True):
        self.paid_amount = self.payments_total()
        if save:
            super().save(update_fields=['paid_amount'])
        return self.paid_amount

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

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

        if self.period_start and self.period_end and self.period_start > self.period_end:
            errors['period_end'] = 'Period end must be on or after period start.'

        if errors:
            raise ValidationError(errors)


class LabourPaymentEntry(models.Model):
    payment = models.ForeignKey(LabourPayment, on_delete=models.CASCADE, related_name='payment_entries')
    labour = models.ForeignKey(Labour, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['date', 'id']

    def __str__(self):
        return f'{self.labour.name} payment {self.amount} on {self.date}'

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def clean(self):
        errors = {}

        if self.amount <= 0:
            errors['amount'] = 'Payment amount must be greater than zero.'

        if self.payment_id:
            if self.labour_id != self.payment.labour_id:
                errors['labour'] = 'Payment labour must match the wage entry labour.'

            payment_site_id = self.payment.site_id
            if payment_site_id and self.site_id and self.site_id != payment_site_id:
                errors['site'] = 'Payment site must match the wage entry site.'

            existing_total = self.payment.payment_entries.exclude(pk=self.pk).aggregate(total=Sum('amount'))['total'] or 0
            if existing_total + self.amount > self.payment.total_amount:
                errors['amount'] = 'Payment amount cannot exceed the remaining amount for this wage entry.'

        if errors:
            raise ValidationError(errors)
