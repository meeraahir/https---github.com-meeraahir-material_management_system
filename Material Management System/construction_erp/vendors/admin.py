from django.contrib import admin
from .models import Vendor, VendorTransaction, VendorPayment


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'phone', 'email')
    search_fields = ('name', 'phone', 'email', 'address')


@admin.register(VendorTransaction)
class VendorTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'vendor', 'site', 'material', 'total_amount', 'paid_amount', 'date')
    list_filter = ('site', 'vendor', 'date')
    search_fields = ('vendor__name', 'site__name', 'material__name', 'invoice_number')


@admin.register(VendorPayment)
class VendorPaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'purchase', 'vendor', 'site', 'amount', 'date')
    list_filter = ('vendor', 'site', 'date')
    search_fields = ('vendor__name', 'site__name', 'reference_number', 'purchase__invoice_number')
