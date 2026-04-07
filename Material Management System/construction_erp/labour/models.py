from django.core.exceptions import ValidationError
from django.db import models
from sites.models import Site

# Create your models here.
class Labour(models.Model):
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=15)
    per_day_wage = models.FloatField()

    def __str__(self):
        return self.name


class LabourAttendance(models.Model):
    labour = models.ForeignKey(Labour, on_delete=models.CASCADE)
    site = models.ForeignKey(Site, on_delete=models.CASCADE)

    date = models.DateField()
    present = models.BooleanField(default=True)


class LabourPayment(models.Model):
    labour = models.ForeignKey(Labour, on_delete=models.CASCADE)

    total_amount = models.FloatField()
    paid_amount = models.FloatField(default=0)

    def pending_amount(self):
        return self.total_amount - self.paid_amount

    def clean(self):
        errors = {}

        if self.total_amount < 0:
            errors['total_amount'] = 'Total amount must be zero or positive.'

        if self.paid_amount < 0:
            errors['paid_amount'] = 'Paid amount must be zero or positive.'

        if self.paid_amount > self.total_amount:
            errors['paid_amount'] = 'Paid amount cannot exceed total amount.'

        if errors:
            raise ValidationError(errors)