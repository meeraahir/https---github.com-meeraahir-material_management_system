from django.db import transaction
from django.db.models import Sum
from rest_framework import serializers

from .models import Vendor, VendorTransaction, VendorPayment


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

    def _sync_payment_history(self, purchase, desired_paid_amount, payment_date):
        current_paid_amount = purchase.payments_total()

        if desired_paid_amount < current_paid_amount:
            raise serializers.ValidationError({
                'paid_amount': 'Paid amount cannot be reduced because payment history already exists.'
            })

        delta = desired_paid_amount - current_paid_amount
        if delta > 0:
            VendorPayment.objects.create(
                purchase=purchase,
                vendor=purchase.vendor,
                site=purchase.site,
                amount=delta,
                date=payment_date or purchase.date,
                reference_number=purchase.invoice_number,
                remarks='Auto-created from vendor purchase update.',
            )

        purchase.refresh_paid_amount(save=True)

    def create(self, validated_data):
        desired_paid_amount = validated_data.get('paid_amount', 0)

        with transaction.atomic():
            purchase = VendorTransaction(**validated_data)
            purchase.full_clean()
            purchase.save()
            self._sync_payment_history(purchase, desired_paid_amount, validated_data.get('date'))
            return purchase

    def update(self, instance, validated_data):
        desired_paid_amount = validated_data.get('paid_amount', instance.paid_amount)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.full_clean()
            instance.save()
            self._sync_payment_history(instance, desired_paid_amount, validated_data.get('date', instance.date))
            return instance


class VendorPaymentSerializer(serializers.ModelSerializer):
    purchase_invoice_number = serializers.CharField(source='purchase.invoice_number', read_only=True)
    purchase_total_amount = serializers.DecimalField(
        source='purchase.total_amount',
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )
    purchase_pending_amount = serializers.SerializerMethodField(read_only=True)
    vendor = serializers.PrimaryKeyRelatedField(read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    site = serializers.PrimaryKeyRelatedField(read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)

    class Meta:
        model = VendorPayment
        fields = [
            'id',
            'purchase',
            'purchase_invoice_number',
            'purchase_total_amount',
            'purchase_pending_amount',
            'vendor',
            'vendor_name',
            'site',
            'site_name',
            'amount',
            'date',
            'reference_number',
            'remarks',
        ]

    def validate(self, attrs):
        purchase = attrs.get('purchase', getattr(self.instance, 'purchase', None))
        amount = attrs.get('amount', getattr(self.instance, 'amount', 0))

        errors = {}
        if purchase is None:
            errors['purchase'] = 'Purchase must be provided.'
        if amount <= 0:
            errors['amount'] = 'Payment amount must be greater than zero.'
        if purchase is not None:
            existing_total = purchase.payments.exclude(
                pk=getattr(self.instance, 'pk', None)
            ).aggregate(total=Sum('amount'))['total'] or 0
            if existing_total + amount > purchase.total_amount:
                errors['amount'] = 'Payment amount cannot exceed the remaining amount for this purchase.'

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def get_purchase_pending_amount(self, obj):
        return obj.purchase.pending_amount()

    def _apply_purchase_details(self, validated_data):
        purchase = validated_data['purchase']
        validated_data['vendor'] = purchase.vendor
        validated_data['site'] = purchase.site
        return validated_data

    def create(self, validated_data):
        with transaction.atomic():
            payment = VendorPayment(**self._apply_purchase_details(validated_data))
            payment.full_clean()
            payment.save()
            payment.purchase.refresh_paid_amount(save=True)
            return payment

    def update(self, instance, validated_data):
        old_purchase = instance.purchase
        validated_data.setdefault('purchase', instance.purchase)

        with transaction.atomic():
            self._apply_purchase_details(validated_data)
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.full_clean()
            instance.save()
            old_purchase.refresh_paid_amount(save=True)
            instance.purchase.refresh_paid_amount(save=True)
            return instance
