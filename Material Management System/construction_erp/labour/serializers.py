from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import CasualLabourEntry, Labour, LabourAttendance, LabourPayment, LabourPaymentEntry


class LabourSerializer(serializers.ModelSerializer):
    class Meta:
        model = Labour
        fields = [
            'id',
            'name',
            'phone',
            'per_day_wage',
            'labour_type',
        ]


class LabourAttendanceSerializer(serializers.ModelSerializer):
    labour_name = serializers.CharField(source='labour.name', read_only=True)
    site_name = serializers.CharField(source='site.name', read_only=True)

    class Meta:
        model = LabourAttendance
        fields = [
            'id',
            'labour',
            'labour_name',
            'site',
            'site_name',
            'date',
            'present',
        ]

    def validate(self, attrs):
        labour = attrs.get('labour', getattr(self.instance, 'labour', None))
        site = attrs.get('site', getattr(self.instance, 'site', None))
        attendance_date = attrs.get('date', getattr(self.instance, 'date', None))
        present = attrs.get('present', getattr(self.instance, 'present', True))

        if self.instance:
            attendance = self.instance
            original_values = {
                'labour': attendance.labour,
                'site': attendance.site,
                'date': attendance.date,
                'present': attendance.present,
            }
            attendance.labour = labour
            attendance.site = site
            attendance.date = attendance_date
            attendance.present = present
        else:
            attendance = LabourAttendance(
                labour=labour,
                site=site,
                date=attendance_date,
                present=present,
            )

        try:
            attendance.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        finally:
            if self.instance:
                for attr, value in original_values.items():
                    setattr(attendance, attr, value)

        return attrs


class CasualLabourEntrySerializer(serializers.ModelSerializer):
    site_name = serializers.CharField(source='site.name', read_only=True)

    class Meta:
        model = CasualLabourEntry
        fields = [
            'id',
            'labour_name',
            'labour_type',
            'site',
            'site_name',
            'date',
            'paid_amount',
        ]

    def validate(self, attrs):
        labour_name = attrs.get('labour_name', getattr(self.instance, 'labour_name', None))
        labour_type = attrs.get('labour_type', getattr(self.instance, 'labour_type', None))
        site = attrs.get('site', getattr(self.instance, 'site', None))
        entry_date = attrs.get('date', getattr(self.instance, 'date', None))
        paid_amount = attrs.get('paid_amount', getattr(self.instance, 'paid_amount', None))

        if self.instance:
            entry = self.instance
            original_values = {
                'labour_name': entry.labour_name,
                'labour_type': entry.labour_type,
                'site': entry.site,
                'date': entry.date,
                'paid_amount': entry.paid_amount,
            }
            entry.labour_name = labour_name
            entry.labour_type = labour_type
            entry.site = site
            entry.date = entry_date
            entry.paid_amount = paid_amount
        else:
            entry = CasualLabourEntry(
                labour_name=labour_name,
                labour_type=labour_type,
                site=site,
                date=entry_date,
                paid_amount=paid_amount,
            )

        try:
            entry.full_clean()
        except ValidationError as exc:
            raise serializers.ValidationError(exc.message_dict)
        finally:
            if self.instance:
                for attr, value in original_values.items():
                    setattr(entry, attr, value)

        return attrs


class LabourPaymentSerializer(serializers.ModelSerializer):
    pending_amount = serializers.SerializerMethodField(read_only=True)
    calculated_total_amount = serializers.SerializerMethodField(read_only=True)
    attendance_days = serializers.SerializerMethodField(read_only=True)
    labour_name = serializers.CharField(source='labour.name', read_only=True)
    site_name = serializers.SerializerMethodField(read_only=True)
    auto_calculate_total = serializers.BooleanField(write_only=True, required=False, default=False)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, required=False)

    class Meta:
        model = LabourPayment
        fields = [
            'id',
            'labour',
            'labour_name',
            'site',
            'site_name',
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
        auto_calculate_missing = (
            self.instance is None
            and 'auto_calculate_total' not in attrs
            and total_amount == 0
        )

        if self.instance is None and 'total_amount' not in attrs:
            auto_calculate_total = True

        if auto_calculate_total or auto_calculate_missing:
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
        elif self.instance is None:
            payment_date = payment_date or timezone.localdate()
            attrs['date'] = payment_date
            attrs['period_start'] = period_start or payment_date
            attrs['period_end'] = period_end or period_start or payment_date

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

    def get_site_name(self, obj):
        return obj.site.name if obj.site else None

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

    def _matching_wage_entries(self, validated_data):
        site = validated_data.get('site')
        queryset = LabourPayment.objects.select_for_update().filter(
            labour=validated_data.get('labour'),
            period_start=validated_data.get('period_start'),
            period_end=validated_data.get('period_end'),
        )

        if site:
            queryset = queryset.filter(site=site)
        else:
            queryset = queryset.filter(site__isnull=True)

        return queryset.order_by('id')

    def _merge_duplicate_wage_entries(self, canonical_entry, duplicate_entries):
        for duplicate in duplicate_entries:
            for payment_entry in duplicate.payment_entries.all():
                payment_entry.payment = canonical_entry
                payment_entry.site = canonical_entry.site
                payment_entry.save()
            duplicate.delete()

        canonical_entry.refresh_paid_amount(save=True)
        return canonical_entry

    def create(self, validated_data):
        validated_data.pop('auto_calculate_total', None)
        payment_amount = validated_data.get('paid_amount', 0)

        with transaction.atomic():
            matching_entries = list(self._matching_wage_entries(validated_data))

            if matching_entries:
                wage_entry = matching_entries[0]
                self._merge_duplicate_wage_entries(wage_entry, matching_entries[1:])

                total_amount = validated_data.get('total_amount', wage_entry.total_amount)
                if total_amount < wage_entry.payments_total() + payment_amount:
                    raise serializers.ValidationError({
                        'paid_amount': 'Paid amount cannot exceed pending amount for this labour, site, and period.'
                    })

                wage_entry.total_amount = total_amount
                wage_entry.date = validated_data.get('date', wage_entry.date)
                wage_entry.notes = validated_data.get('notes', wage_entry.notes)
                wage_entry.full_clean()
                wage_entry.save()

                if payment_amount > 0:
                    LabourPaymentEntry.objects.create(
                        payment=wage_entry,
                        labour=wage_entry.labour,
                        site=wage_entry.site,
                        amount=payment_amount,
                        date=validated_data.get('date') or wage_entry.date,
                        notes=validated_data.get('notes') or 'Additional labour payment.',
                    )

                wage_entry.refresh_paid_amount(save=True)
                return wage_entry

            wage_entry = LabourPayment(**validated_data)
            wage_entry.full_clean()
            wage_entry.save()
            self._sync_payment_history(wage_entry, payment_amount, validated_data.get('date'))
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
