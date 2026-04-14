from django.contrib import admin
from .models import Material, MaterialStock, MaterialUsage, MaterialVariant, MaterialVariantPrice


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'unit')
    search_fields = ('name',)


@admin.register(MaterialStock)
class MaterialStockAdmin(admin.ModelAdmin):
    list_display = ('id', 'site', 'material', 'quantity_received', 'quantity_used', 'cost_per_unit', 'date')
    list_filter = ('site', 'material', 'date')
    search_fields = ('material__name', 'site__name', 'invoice_number')


@admin.register(MaterialVariant)
class MaterialVariantAdmin(admin.ModelAdmin):
    list_display = ('id', 'material', 'label', 'size_mm', 'unit_weight', 'is_active')
    list_filter = ('material', 'is_active')
    search_fields = ('material__name', 'label')


@admin.register(MaterialVariantPrice)
class MaterialVariantPriceAdmin(admin.ModelAdmin):
    list_display = ('id', 'variant', 'date', 'price_per_unit')
    list_filter = ('date', 'variant__material')
    search_fields = ('variant__material__name', 'variant__label', 'notes')


@admin.register(MaterialUsage)
class MaterialUsageAdmin(admin.ModelAdmin):
    list_display = ('id', 'receipt', 'site', 'material', 'quantity', 'date')
    list_filter = ('site', 'material', 'date')
    search_fields = ('material__name', 'site__name', 'receipt__invoice_number')
