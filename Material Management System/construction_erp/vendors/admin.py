from django.contrib import admin
from .models import Vendor, VendorTransaction

# Register your models here.
admin.site.register(Vendor)
admin.site.register(VendorTransaction)
