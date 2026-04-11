from django.db import transaction
from rest_framework import serializers

from .utils import apply_receipt_style_entry
from .models import Party, Transaction, ClientReceipt


class PartySerializer(serializers.ModelSerializer):
    class Meta:
        model = Party
        fields = '__all__'


class TransactionSerializer(serializers.ModelSerializer):
    received_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        write_only=True,
        required=False,
    )
    current_received_amount = serializers.SerializerMethodField(read_only=True)
    pending_amount = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'party',
            'site',
            'amount',
            'received',
            'received_amount',
            'date',
            'current_received_amount',
            'pending_amount',
        ]

    def validate(self, attrs):
        amount = attrs.get('amount', getattr(self.instance, 'amount', 0))
        received_amount = attrs.get('received_amount')

        if amount < 0:
            raise serializers.ValidationError({'amount': 'Amount must be zero or positive.'})
        if received_amount is not None and received_amount > amount:
            raise serializers.ValidationError({'received_amount': 'Received amount cannot exceed invoice amount.'})

        return attrs

    def get_current_received_amount(self, obj):
        return obj.receipts_total()

    def get_pending_amount(self, obj):
        return obj.pending_amount()

    def _sync_receipts(self, invoice, should_mark_received, receipt_date):
        current_received_amount = invoice.receipts_total()

        if should_mark_received:
            delta = invoice.amount - current_received_amount
            if delta > 0:
                ClientReceipt.objects.create(
                    invoice=invoice,
                    party=invoice.party,
                    site=invoice.site,
                    amount=delta,
                    date=receipt_date or invoice.date,
                    notes='Auto-created from receivable update.',
                )
        elif current_received_amount > 0:
            raise serializers.ValidationError({
                'received': 'Received status cannot be set to false once receipt history exists.'
            })

        invoice.sync_received_status(save=True)

    def _sync_received_amount(self, invoice, desired_received_amount, receipt_date):
        current_received_amount = invoice.receipts_total()

        if desired_received_amount is None:
            return

        if desired_received_amount < current_received_amount:
            raise serializers.ValidationError({
                'received_amount': 'Received amount cannot be reduced because receipt history already exists.'
            })

        delta = desired_received_amount - current_received_amount
        if delta > 0:
            ClientReceipt.objects.create(
                invoice=invoice,
                party=invoice.party,
                site=invoice.site,
                amount=delta,
                date=receipt_date or invoice.date,
                notes='Auto-created from receivable received_amount update.',
            )

        invoice.sync_received_status(save=True)

    def create(self, validated_data):
        desired_received_amount = validated_data.pop('received_amount', None)
        should_mark_received = validated_data.get('received', False)

        with transaction.atomic():
            if (
                desired_received_amount is not None
                and desired_received_amount > 0
                and desired_received_amount == validated_data.get('amount')
            ):
                receipt_invoice = apply_receipt_style_entry(
                    validated_data['party'],
                    validated_data['site'],
                    desired_received_amount,
                    validated_data.get('date'),
                )
                if receipt_invoice is not None:
                    return receipt_invoice

            invoice = Transaction(**validated_data)
            invoice.full_clean()
            invoice.save()
            if desired_received_amount is not None:
                self._sync_received_amount(invoice, desired_received_amount, validated_data.get('date'))
            else:
                self._sync_receipts(invoice, should_mark_received, validated_data.get('date'))
            return invoice

    def update(self, instance, validated_data):
        desired_received_amount = validated_data.pop('received_amount', None)
        should_mark_received = validated_data.get('received', instance.received)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.full_clean()
            instance.save()
            if desired_received_amount is not None:
                self._sync_received_amount(instance, desired_received_amount, validated_data.get('date', instance.date))
            else:
                self._sync_receipts(instance, should_mark_received, validated_data.get('date', instance.date))
            return instance
