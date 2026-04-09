from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Labour, LabourAttendance, LabourPayment, LabourPaymentEntry


class LabourSerializer(serializers.ModelSerializer):
    class Meta:
        model = Labour
        fields = '__all__'


class LabourAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabourAttendance
        fields = '__all__'

    def validate(self, attrs):
        labour = attrs.get('labour', getattr(self.instance, 'labour', None))
        site = attrs.get('site', getattr(self.instance, 'site', None))
        attendance_date = attrs.get('date', getattr(self.instance, 'date', None))
        present = attrs.get('present', getattr(self.instance, 'present', True))

        attendance = LabourAttendance(
            labour=labour,
            site=site,
            date=attendance_date,
            present=present,
        )
        if self.instance:
            attendance.pk = self.instance.pk

        try:
            attendance.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)

        return attrs


class LabourPaymentSerializer(serializers.ModelSerializer):
    pending_amount = serializers.SerializerMethodField(read_only=True)
    calculated_total_amount = serializers.SerializerMethodField(read_only=True)
    attendance_days = serializers.SerializerMethodField(read_only=True)
    auto_calculate_total = serializers.BooleanField(write_only=True, required=False, default=False)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)

    class Meta:
        model = LabourPayment
        fields = [
            'id',
            'labour',
            'site',
            'total_amount',
            'paid_amount',
            'pending_amount',
            'calculated_total_amount',
            'attendance_days',
            'date',
            'period_start',
            'period_end',
            'notes',
            'auto_calculate_total',
        ]

    def validate(self, attrs):
        total_amount = attrs.get('total_amount', getattr(self.instance, 'total_amount', 0))
        paid_amount = attrs.get('paid_amount', getattr(self.instance, 'paid_amount', 0))
        labour = attrs.get('labour', getattr(self.instance, 'labour', None))
        site = attrs.get('site', getattr(self.instance, 'site', None))
        payment_date = attrs.get('date', getattr(self.instance, 'date', None))
        period_start = attrs.get('period_start', getattr(self.instance, 'period_start', None))
        period_end = attrs.get('period_end', getattr(self.instance, 'period_end', None))
        auto_calculate_total = attrs.get('auto_calculate_total', False)

        if self.instance is None and 'total_amount' not in attrs:
            auto_calculate_total = True

        if auto_calculate_total:
            if labour is None:
                raise serializers.ValidationError({'labour': 'Labour is required to auto-calculate total amount.'})

            payment_date = payment_date or timezone.localdate()
            normalized_start = period_start or payment_date
            normalized_end = period_end or period_start or payment_date

            payment = LabourPayment(
                labour=labour,
                site=site,
                date=payment_date,
                period_start=normalized_start,
                period_end=normalized_end,
                total_amount=0,
                paid_amount=paid_amount,
                notes=attrs.get('notes', getattr(self.instance, 'notes', None)),
            )
            total_amount = payment.calculated_total_amount()
            attrs['date'] = payment_date
            attrs['total_amount'] = total_amount
            attrs['period_start'] = normalized_start
            attrs['period_end'] = normalized_end
        elif 'total_amount' not in attrs and self.instance is None:
            raise serializers.ValidationError({'total_amount': 'Total amount is required when auto calculation is disabled.'})

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

    def get_calculated_total_amount(self, obj):
        return obj.calculated_total_amount()

    def get_attendance_days(self, obj):
        return obj.attendance_days()

    def _sync_payment_history(self, wage_entry, desired_paid_amount, payment_date):
        current_paid_amount = wage_entry.payments_total()

        if desired_paid_amount < current_paid_amount:
            raise serializers.ValidationError({
                'paid_amount': 'Paid amount cannot be reduced because payment history already exists.'
            })

        delta = desired_paid_amount - current_paid_amount
        if delta > 0:
            LabourPaymentEntry.objects.create(
                payment=wage_entry,
                labour=wage_entry.labour,
                site=wage_entry.site,
                amount=delta,
                date=payment_date or wage_entry.date,
                notes='Auto-created from labour payment update.',
            )

        wage_entry.refresh_paid_amount(save=True)

    def create(self, validated_data):
        validated_data.pop('auto_calculate_total', None)
        desired_paid_amount = validated_data.get('paid_amount', 0)

        with transaction.atomic():
            wage_entry = LabourPayment(**validated_data)
            wage_entry.full_clean()
            wage_entry.save()
            self._sync_payment_history(wage_entry, desired_paid_amount, validated_data.get('date'))
            return wage_entry

    def update(self, instance, validated_data):
        validated_data.pop('auto_calculate_total', None)
        desired_paid_amount = validated_data.get('paid_amount', instance.paid_amount)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.full_clean()
            instance.save()
            self._sync_payment_history(instance, desired_paid_amount, validated_data.get('date', instance.date))
            return instance
