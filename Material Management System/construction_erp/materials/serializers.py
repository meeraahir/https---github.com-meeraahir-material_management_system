from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from .models import Material, MaterialStock, MaterialUsage


def format_date_display(value):
    if not value:
        return None
    return f'{value.day} {value.strftime("%B %Y")}'


class MaterialSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=255)
    unit = serializers.ChoiceField(choices=Material.UNIT_CHOICES)

    class Meta:
        model = Material
        fields = '__all__'

    def validate_name(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError('Material name must not be blank.')
        return normalized

    def validate(self, attrs):
        name = attrs.get('name', getattr(self.instance, 'name', None))
        if self.instance and self.instance.name.lower() != name.lower() and Material.objects.filter(name__iexact=name).exists():
            raise serializers.ValidationError({'name': 'A material with this name already exists.'})
        if not self.instance and Material.objects.filter(name__iexact=name).exists():
            raise serializers.ValidationError({'name': 'A material with this name already exists.'})
        return attrs


class MaterialStockSerializer(serializers.ModelSerializer):
    total_cost = serializers.SerializerMethodField(read_only=True)
    remaining_stock = serializers.SerializerMethodField(read_only=True)
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    date_display = serializers.SerializerMethodField(read_only=True)

    quantity_received = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal('0'))
    quantity_used = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal('0'))
    cost_per_unit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0'))
    transport_cost = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0'))

    class Meta:
        model = MaterialStock
        fields = [
            'id',
            'site',
            'site_name',
            'material',
            'material_name',
            'material_unit',
            'quantity_received',
            'quantity_used',
            'cost_per_unit',
            'transport_cost',
            'invoice_number',
            'notes',
            'date',
            'date_display',
            'total_cost',
            'remaining_stock',
        ]

    def validate(self, attrs):
        if self.instance:
            material_stock = self.instance
            original_values = {
                'site': material_stock.site,
                'material': material_stock.material,
                'quantity_received': material_stock.quantity_received,
                'quantity_used': material_stock.quantity_used,
                'cost_per_unit': material_stock.cost_per_unit,
                'transport_cost': material_stock.transport_cost,
                'invoice_number': material_stock.invoice_number,
                'notes': material_stock.notes,
                'date': material_stock.date,
            }
            for attr, value in attrs.items():
                setattr(material_stock, attr, value)
        else:
            material_stock = MaterialStock(**attrs)

        try:
            material_stock.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        finally:
            if self.instance:
                for attr, value in original_values.items():
                    setattr(material_stock, attr, value)

        return attrs

    def _as_decimal(self, value):
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value or 0))

    def _sync_usage_history(self, stock, desired_usage, current_usage, usage_date):
        desired_usage = self._as_decimal(desired_usage)
        current_usage = self._as_decimal(current_usage)

        if desired_usage < current_usage:
            raise serializers.ValidationError({
                'quantity_used': 'Used quantity cannot be reduced because usage history is already recorded.'
            })

        delta = desired_usage - current_usage
        if delta > 0:
            MaterialUsage.objects.create(
                receipt=stock,
                site=stock.site,
                material=stock.material,
                quantity=delta,
                date=usage_date or stock.date,
            )

        if stock.quantity_used != desired_usage:
            stock.quantity_used = desired_usage
            stock.save(update_fields=['quantity_used'])

    def create(self, validated_data):
        desired_usage = validated_data.get('quantity_used', Decimal('0'))

        with transaction.atomic():
            instance = MaterialStock(**validated_data)
            instance.full_clean()
            instance.save()
            self._sync_usage_history(instance, desired_usage, Decimal('0'), validated_data.get('date'))
            return instance

    def update(self, instance, validated_data):
        current_usage = instance.usage_entries.aggregate(total=Sum('quantity'))['total'] or instance.quantity_used
        desired_usage = validated_data.get('quantity_used', instance.quantity_used)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.full_clean()
            instance.save()
            self._sync_usage_history(instance, desired_usage, current_usage, validated_data.get('date', instance.date))
            return instance

    def get_total_cost(self, obj):
        return obj.total_cost()

    def get_remaining_stock(self, obj):
        return obj.remaining_stock()

    def get_date_display(self, obj):
        return format_date_display(obj.date)


class MaterialUsageSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    receipt_date = serializers.DateField(source='receipt.date', read_only=True)
    receipt_invoice_number = serializers.CharField(source='receipt.invoice_number', read_only=True)

    class Meta:
        model = MaterialUsage
        fields = [
            'id',
            'receipt',
            'receipt_date',
            'receipt_invoice_number',
            'site',
            'site_name',
            'material',
            'material_name',
            'quantity',
            'date',
            'notes',
        ]
