from django.contrib import admin
from .models import Party, Transaction, ClientReceipt


@admin.register(Party)
class PartyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'contact')
    search_fields = ('name', 'contact')


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'party', 'site', 'amount', 'received', 'date')
    list_filter = ('site', 'received', 'date')
    search_fields = ('party__name', 'site__name')


@admin.register(ClientReceipt)
class ClientReceiptAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice', 'party', 'site', 'amount', 'date')
    list_filter = ('site', 'date')
    search_fields = ('party__name', 'reference_number', 'invoice__id')
