from django.contrib import admin
from .models import ClientReceipt, MiscellaneousExpense, Party, Transaction


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
    list_display = (
        'id',
        'invoice',
        'party',
        'site',
        'amount',
        'payment_mode',
        'sender_name',
        'receiver_name',
        'cheque_number',
        'date',
    )
    list_filter = ('site', 'payment_mode', 'date')
    search_fields = ('party__name', 'sender_name', 'receiver_name', 'cheque_number', 'reference_number', 'invoice__id')


@admin.register(MiscellaneousExpense)
class MiscellaneousExpenseAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'site', 'labour', 'paid_to_name', 'amount', 'payment_mode', 'date')
    list_filter = ('site', 'payment_mode', 'date')
    search_fields = ('title', 'paid_to_name', 'labour__name', 'site__name', 'notes')
