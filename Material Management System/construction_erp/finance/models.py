from django.core.exceptions import ValidationError
from django.db import models
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

    amount = models.FloatField()
    received = models.BooleanField(default=False)

    date = models.DateField(auto_now_add=True)

    def clean(self):
        if self.amount < 0:
            raise ValidationError({'amount': 'Amount must be zero or positive.'})