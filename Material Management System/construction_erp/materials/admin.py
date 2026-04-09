from django.contrib import admin
from .models import Material, MaterialStock, MaterialUsage


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'unit')
    search_fields = ('name',)


@admin.register(MaterialStock)
class MaterialStockAdmin(admin.ModelAdmin):
    list_display = ('id', 'site', 'material', 'quantity_received', 'quantity_used', 'cost_per_unit', 'date')
    list_filter = ('site', 'material', 'date')
    search_fields = ('material__name', 'site__name', 'invoice_number')


@admin.register(MaterialUsage)
class MaterialUsageAdmin(admin.ModelAdmin):
    list_display = ('id', 'receipt', 'site', 'material', 'quantity', 'date')
    list_filter = ('site', 'material', 'date')
    search_fields = ('material__name', 'site__name', 'receipt__invoice_number')
