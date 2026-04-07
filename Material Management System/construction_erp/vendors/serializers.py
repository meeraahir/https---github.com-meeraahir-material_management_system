from rest_framework import serializers

from .models import Vendor, VendorTransaction


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'


class VendorTransactionSerializer(serializers.ModelSerializer):
    pending_amount = serializers.SerializerMethodField(read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    material_name = serializers.CharField(source='material.name', read_only=True)

    class Meta:
        model = VendorTransaction
        fields = [
            'id',
            'vendor',
            'vendor_name',
            'material',
            'material_name',
            'site',
            'site_name',
            'invoice_number',
            'description',
            'total_amount',
            'paid_amount',
            'date',
            'pending_amount',
        ]

    def validate(self, attrs):
        total_amount = attrs.get('total_amount', getattr(self.instance, 'total_amount', 0))
        paid_amount = attrs.get('paid_amount', getattr(self.instance, 'paid_amount', 0))

        errors = {}
        if total_amount < 0:
            errors['total_amount'] = 'Total amount must be zero or positive.'
        if paid_amount < 0:
            errors['paid_amount'] = 'Paid amount must be zero or positive.'
        if paid_amount > total_amount:
            errors['paid_amount'] = 'Paid amount cannot exceed total amount.'

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def get_pending_amount(self, obj):
        return obj.pending_amount()
