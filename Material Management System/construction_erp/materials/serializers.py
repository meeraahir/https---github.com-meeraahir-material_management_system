from decimal import Decimal, ROUND_HALF_UP

from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import serializers

from .models import Material, MaterialStock, MaterialUsage, MaterialVariant, MaterialVariantPrice


def format_date_display(value):
    if not value:
        return None
    return f'{value.day} {value.strftime("%B %Y")}'


class MaterialSerializer(serializers.ModelSerializer):
    variants = serializers.SerializerMethodField(read_only=True)
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

    def get_variants(self, obj):
        variants = obj.variants.filter(is_active=True).order_by('size_mm', 'label')
        return MaterialVariantSerializer(variants, many=True).data


class MaterialVariantSerializer(serializers.ModelSerializer):
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    current_price = serializers.SerializerMethodField(read_only=True)
    current_price_date = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = MaterialVariant
        fields = [
            'id',
            'material',
            'material_name',
            'material_unit',
            'label',
            'size_mm',
            'unit_weight',
            'is_active',
            'current_price',
            'current_price_date',
        ]

    def validate(self, attrs):
        if self.instance:
            variant = self.instance
            original_values = {
                'material': variant.material,
                'label': variant.label,
                'size_mm': variant.size_mm,
                'unit_weight': variant.unit_weight,
                'is_active': variant.is_active,
            }
            for attr, value in attrs.items():
                setattr(variant, attr, value)
        else:
            variant = MaterialVariant(**attrs)

        try:
            variant.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        finally:
            if self.instance:
                for attr, value in original_values.items():
                    setattr(variant, attr, value)

        return attrs

    def get_current_price(self, obj):
        latest_price = obj.daily_prices.order_by('-date', '-id').first()
        return latest_price.price_per_unit if latest_price else None

    def get_current_price_date(self, obj):
        latest_price = obj.daily_prices.order_by('-date', '-id').first()
        return latest_price.date if latest_price else None


class MaterialVariantPriceSerializer(serializers.ModelSerializer):
    material_id = serializers.IntegerField(source='variant.material.id', read_only=True)
    material_name = serializers.CharField(source='variant.material.name', read_only=True)
    variant_label = serializers.CharField(source='variant.label', read_only=True)
    variant_size_mm = serializers.DecimalField(source='variant.size_mm', max_digits=8, decimal_places=2, read_only=True)
    price_per_unit = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal('0'))

    class Meta:
        model = MaterialVariantPrice
        fields = [
            'id',
            'variant',
            'variant_label',
            'variant_size_mm',
            'material_id',
            'material_name',
            'date',
            'price_per_unit',
            'notes',
        ]

    def validate(self, attrs):
        if self.instance:
            variant_price = self.instance
            original_values = {
                'variant': variant_price.variant,
                'date': variant_price.date,
                'price_per_unit': variant_price.price_per_unit,
                'notes': variant_price.notes,
            }
            for attr, value in attrs.items():
                setattr(variant_price, attr, value)
        else:
            variant_price = MaterialVariantPrice(**attrs)

        try:
            variant_price.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        finally:
            if self.instance:
                for attr, value in original_values.items():
                    setattr(variant_price, attr, value)

        return attrs


class MaterialStockSerializer(serializers.ModelSerializer):
    total_cost = serializers.SerializerMethodField(read_only=True)
    remaining_stock = serializers.SerializerMethodField(read_only=True)
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.unit', read_only=True)
    material_variant_label = serializers.CharField(source='material_variant.label', read_only=True)
    material_variant_size_mm = serializers.DecimalField(source='material_variant.size_mm', max_digits=8, decimal_places=2, read_only=True)
    material_variant_unit_weight = serializers.DecimalField(source='material_variant.unit_weight', max_digits=14, decimal_places=3, read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    date_display = serializers.SerializerMethodField(read_only=True)

    quantity_received = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal('0'))
    quantity_used = serializers.DecimalField(max_digits=14, decimal_places=3, min_value=Decimal('0'))
    cost_per_unit = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=Decimal('0'),
        required=False,
        error_messages={
            'max_decimal_places': 'Ensure that there are no more than 2 decimal places, or leave it blank to auto-calculate from the selected steel size and daily price.'
        },
    )
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
            'material_variant',
            'material_variant_label',
            'material_variant_size_mm',
            'material_variant_unit_weight',
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

    def _has_more_than_two_decimals(self, value):
        return isinstance(value, Decimal) and value.as_tuple().exponent < -2

    def _calculate_cost_per_unit(self, material, variant, effective_date):
        if not variant:
            return None

        daily_price = variant.daily_prices.filter(date=effective_date).first()
        if not daily_price:
            return None

        calculated_value = daily_price.price_per_unit
        return calculated_value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def _apply_cost_per_unit_logic(self, attrs):
        material = attrs.get('material', getattr(self.instance, 'material', None))
        variant = attrs.get('material_variant', getattr(self.instance, 'material_variant', None))
        effective_date = attrs.get('date', getattr(self.instance, 'date', timezone.now().date()))
        entered_cost = attrs.get('cost_per_unit')
        calculated_cost = self._calculate_cost_per_unit(material, variant, effective_date)

        if calculated_cost is not None:
            entered_weight_instead_of_price = (
                entered_cost is not None
                and variant is not None
                and variant.unit_weight is not None
                and entered_cost == variant.unit_weight
            )
            invalid_decimal_input = entered_cost is not None and self._has_more_than_two_decimals(entered_cost)

            if entered_cost is None or entered_weight_instead_of_price or invalid_decimal_input:
                attrs['cost_per_unit'] = calculated_cost
                return attrs

        if entered_cost is not None and self._has_more_than_two_decimals(entered_cost):
            raise serializers.ValidationError({
                'cost_per_unit': 'Ensure that there are no more than 2 decimal places, or leave it blank to auto-calculate from the selected steel size and daily price.'
            })

        return attrs

    def validate(self, attrs):
        attrs = self._apply_cost_per_unit_logic(attrs)

        if self.instance:
            material_stock = self.instance
            original_values = {
                'site': material_stock.site,
                'material': material_stock.material,
                'material_variant': material_stock.material_variant,
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
            if 'cost_per_unit' not in attrs:
                raise serializers.ValidationError({
                    'cost_per_unit': 'Cost per unit is required, or add a daily price for the selected material variant and date.'
                })
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
    receipt_material_variant_label = serializers.CharField(source='receipt.material_variant.label', read_only=True)
    receipt_material_variant_size_mm = serializers.DecimalField(source='receipt.material_variant.size_mm', max_digits=8, decimal_places=2, read_only=True)

    class Meta:
        model = MaterialUsage
        fields = [
            'id',
            'receipt',
            'receipt_date',
            'receipt_invoice_number',
            'receipt_material_variant_label',
            'receipt_material_variant_size_mm',
            'site',
            'site_name',
            'material',
            'material_name',
            'quantity',
            'date',
            'notes',
        ]
