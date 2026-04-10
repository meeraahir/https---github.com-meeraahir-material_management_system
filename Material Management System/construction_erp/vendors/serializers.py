from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q, Sum
from rest_framework import serializers

from sites.models import Site
from .models import Vendor, VendorTransaction, VendorPayment


def _raise_drf_validation_error(exc):
    if hasattr(exc, 'message_dict'):
        raise serializers.ValidationError(exc.message_dict)
    raise serializers.ValidationError({'non_field_errors': exc.messages})


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = '__all__'

    def create(self, validated_data):
        try:
            return Vendor.objects.create(**validated_data)
        except ValidationError as exc:
            _raise_drf_validation_error(exc)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        try:
            instance.save()
        except ValidationError as exc:
            _raise_drf_validation_error(exc)

        return instance


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
            try:
                purchase.full_clean()
                purchase.save()
            except ValidationError as exc:
                _raise_drf_validation_error(exc)
            self._sync_payment_history(purchase, desired_paid_amount, validated_data.get('date'))
            return purchase

    def update(self, instance, validated_data):
        desired_paid_amount = validated_data.get('paid_amount', instance.paid_amount)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            try:
                instance.full_clean()
                instance.save()
            except ValidationError as exc:
                _raise_drf_validation_error(exc)
            self._sync_payment_history(instance, desired_paid_amount, validated_data.get('date', instance.date))
            return instance


class VendorPaymentSerializer(serializers.ModelSerializer):
    vendor = serializers.PrimaryKeyRelatedField(queryset=Vendor.objects.all(), required=False)
    site = serializers.PrimaryKeyRelatedField(queryset=Site.objects.all(), required=False)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)
    purchase_invoice_number = serializers.CharField(source='purchase.invoice_number', read_only=True)
    purchase_total_amount = serializers.SerializerMethodField(read_only=True)
    purchase_pending_amount = serializers.SerializerMethodField(read_only=True)
    pending_after_payment = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = VendorPayment
        fields = [
            'id',
            'purchase',
            'purchase_invoice_number',
            'purchase_total_amount',
            'purchase_pending_amount',
            'pending_after_payment',
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
        vendor = attrs.get('vendor', getattr(self.instance, 'vendor', None))
        site = attrs.get('site', getattr(self.instance, 'site', None))
        amount = attrs.get('amount', getattr(self.instance, 'amount', None))

        errors = {}
        if purchase:
            if vendor and vendor.pk != purchase.vendor_id:
                errors['vendor'] = 'Payment vendor must match the purchase vendor.'
            if site and site.pk != purchase.site_id:
                errors['site'] = 'Payment site must match the purchase site.'

            attrs['vendor'] = purchase.vendor
            attrs['site'] = purchase.site

        if amount is not None and amount <= 0:
            errors['amount'] = 'Payment amount must be greater than zero.'

        if errors:
            raise serializers.ValidationError(errors)

        return attrs

    def get_purchase_total_amount(self, obj):
        return obj.purchase.total_amount if obj.purchase_id else 0

    def get_purchase_pending_amount(self, obj):
        return obj.purchase.pending_amount() if obj.purchase_id else 0

    def get_pending_after_payment(self, obj):
        if not obj.purchase_id:
            return 0

        paid_through_payment = VendorPayment.objects.filter(purchase_id=obj.purchase_id).filter(
            Q(date__lt=obj.date) | Q(date=obj.date, id__lte=obj.id)
        ).aggregate(total=Sum('amount'))['total'] or 0

        return obj.purchase.total_amount - paid_through_payment

    def _refresh_purchases(self, *purchases):
        refreshed = set()
        for purchase in purchases:
            if purchase and purchase.pk not in refreshed:
                purchase.refresh_paid_amount(save=True)
                refreshed.add(purchase.pk)

    def create(self, validated_data):
        with transaction.atomic():
            payment = VendorPayment(**validated_data)
            try:
                payment.full_clean()
                payment.save()
            except ValidationError as exc:
                _raise_drf_validation_error(exc)

            self._refresh_purchases(payment.purchase)
            return payment

    def update(self, instance, validated_data):
        old_purchase = instance.purchase

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            try:
                instance.full_clean()
                instance.save()
            except ValidationError as exc:
                _raise_drf_validation_error(exc)

            self._refresh_purchases(old_purchase, instance.purchase)
            return instance
