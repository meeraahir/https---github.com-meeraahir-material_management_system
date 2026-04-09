from django.contrib import admin
from .models import Labour, LabourAttendance, LabourPayment, LabourPaymentEntry


@admin.register(Labour)
class LabourAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'phone', 'per_day_wage')
    search_fields = ('name', 'phone')


@admin.register(LabourAttendance)
class LabourAttendanceAdmin(admin.ModelAdmin):
    list_display = ('id', 'labour', 'site', 'date', 'present')
    list_filter = ('site', 'present', 'date')
    search_fields = ('labour__name', 'site__name')


@admin.register(LabourPayment)
class LabourPaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'labour', 'site', 'total_amount', 'paid_amount', 'date')
    list_filter = ('site', 'date')
    search_fields = ('labour__name', 'site__name')


@admin.register(LabourPaymentEntry)
class LabourPaymentEntryAdmin(admin.ModelAdmin):
    list_display = ('id', 'payment', 'labour', 'site', 'amount', 'date')
    list_filter = ('site', 'date')
    search_fields = ('labour__name', 'payment__id')
