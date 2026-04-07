from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import Material, MaterialStock


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

    quantity_received = serializers.FloatField(min_value=0)
    quantity_used = serializers.FloatField(min_value=0)
    cost_per_unit = serializers.FloatField(min_value=0)
    transport_cost = serializers.FloatField(min_value=0)

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
            'date',
            'total_cost',
            'remaining_stock',
        ]

    def validate(self, attrs):
        site = attrs.get('site', getattr(self.instance, 'site', None))
        material = attrs.get('material', getattr(self.instance, 'material', None))
        quantity_received = attrs.get('quantity_received', getattr(self.instance, 'quantity_received', 0))
        quantity_used = attrs.get('quantity_used', getattr(self.instance, 'quantity_used', 0))
        cost_per_unit = attrs.get('cost_per_unit', getattr(self.instance, 'cost_per_unit', 0))
        transport_cost = attrs.get('transport_cost', getattr(self.instance, 'transport_cost', 0))

        data = {
            'site': site,
            'material': material,
            'quantity_received': quantity_received,
            'quantity_used': quantity_used,
            'cost_per_unit': cost_per_unit,
            'transport_cost': transport_cost,
        }

        if self.instance:
            material_stock = MaterialStock(**data)
            material_stock.pk = self.instance.pk
        else:
            material_stock = MaterialStock(**data)

        try:
            material_stock.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

        return attrs

    def create(self, validated_data):
        instance = MaterialStock(**validated_data)
        instance.full_clean()
        instance.save()
        return instance

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.full_clean()
        instance.save()
        return instance

    def get_total_cost(self, obj):
        return obj.total_cost()

    def get_remaining_stock(self, obj):
        return obj.remaining_stock()
