from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import serializers

from core.payment_details import validate_payment_details
from .utils import apply_receipt_style_entry
from .models import ClientReceipt, MiscellaneousExpense, OwnerPayout, Party, Transaction


def _raise_drf_validation_error(exc):
    if hasattr(exc, 'message_dict'):
        raise serializers.ValidationError(exc.message_dict)
    raise serializers.ValidationError({'non_field_errors': exc.messages})


class PartySerializer(serializers.ModelSerializer):
    class Meta:
        model = Party
        fields = '__all__'

    def create(self, validated_data):
        try:
            return Party.objects.create(**validated_data)
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


class TransactionSerializer(serializers.ModelSerializer):
    received_amount = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        min_value=0,
        write_only=True,
        required=False,
    )
    receipt_payment_mode = serializers.ChoiceField(
        choices=ClientReceipt._meta.get_field('payment_mode').choices,
        write_only=True,
        required=False,
        default='cash',
    )
    receipt_sender_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    receipt_receiver_name = serializers.CharField(write_only=True, required=False, allow_blank=True)
    receipt_cheque_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    current_received_amount = serializers.SerializerMethodField(read_only=True)
    pending_amount = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id',
            'party',
            'site',
            'amount',
            'phase_name',
            'description',
            'received',
            'received_amount',
            'receipt_payment_mode',
            'receipt_sender_name',
            'receipt_receiver_name',
            'receipt_cheque_number',
            'date',
            'current_received_amount',
            'pending_amount',
        ]

    def validate(self, attrs):
        amount = attrs.get('amount', getattr(self.instance, 'amount', 0))
        received_amount = attrs.get('received_amount')
        receipt_payment_mode = attrs.get('receipt_payment_mode', 'cash')
        party = attrs.get('party', getattr(self.instance, 'party', None))

        if amount < 0:
            raise serializers.ValidationError({'amount': 'Amount must be zero or positive.'})
        if received_amount is not None and received_amount > amount:
            raise serializers.ValidationError({'received_amount': 'Received amount cannot exceed invoice amount.'})

        payment_details = validate_payment_details(
            payment_mode=receipt_payment_mode,
            sender_name=attrs.get('receipt_sender_name'),
            receiver_name=attrs.get('receipt_receiver_name'),
            cheque_number=attrs.get('receipt_cheque_number'),
            default_sender_name=party.name if party else None,
        )
        if payment_details['errors']:
            raise serializers.ValidationError({
                f'receipt_{field}': message
                for field, message in payment_details['errors'].items()
            })

        attrs['receipt_sender_name'] = payment_details['sender_name']
        attrs['receipt_receiver_name'] = payment_details['receiver_name']
        attrs['receipt_cheque_number'] = payment_details['cheque_number']

        return attrs

    def get_current_received_amount(self, obj):
        return obj.receipts_total()

    def get_pending_amount(self, obj):
        return obj.pending_amount()

    def _sync_receipts(
        self,
        invoice,
        should_mark_received,
        receipt_date,
        receipt_payment_mode,
        receipt_sender_name,
        receipt_receiver_name,
        receipt_cheque_number,
    ):
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
                    payment_mode=receipt_payment_mode,
                    sender_name=receipt_sender_name,
                    receiver_name=receipt_receiver_name,
                    cheque_number=receipt_cheque_number,
                    notes='Auto-created from receivable update.',
                )
        elif current_received_amount > 0:
            raise serializers.ValidationError({
                'received': 'Received status cannot be set to false once receipt history exists.'
            })

        invoice.sync_received_status(save=True)

    def _sync_received_amount(
        self,
        invoice,
        desired_received_amount,
        receipt_date,
        receipt_payment_mode,
        receipt_sender_name,
        receipt_receiver_name,
        receipt_cheque_number,
    ):
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
                payment_mode=receipt_payment_mode,
                sender_name=receipt_sender_name,
                receiver_name=receipt_receiver_name,
                cheque_number=receipt_cheque_number,
                notes='Auto-created from receivable received_amount update.',
            )

        invoice.sync_received_status(save=True)

    def create(self, validated_data):
        desired_received_amount = validated_data.pop('received_amount', None)
        receipt_payment_mode = validated_data.pop('receipt_payment_mode', 'cash')
        receipt_sender_name = validated_data.pop('receipt_sender_name', None)
        receipt_receiver_name = validated_data.pop('receipt_receiver_name', None)
        receipt_cheque_number = validated_data.pop('receipt_cheque_number', None)
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
                    payment_mode=receipt_payment_mode,
                    sender_name=receipt_sender_name,
                    receiver_name=receipt_receiver_name,
                    cheque_number=receipt_cheque_number,
                )
                if receipt_invoice is not None:
                    return receipt_invoice

            invoice = Transaction(**validated_data)
            invoice.full_clean()
            invoice.save()
            if desired_received_amount is not None:
                self._sync_received_amount(
                    invoice,
                    desired_received_amount,
                    validated_data.get('date'),
                    receipt_payment_mode,
                    receipt_sender_name,
                    receipt_receiver_name,
                    receipt_cheque_number,
                )
            else:
                self._sync_receipts(
                    invoice,
                    should_mark_received,
                    validated_data.get('date'),
                    receipt_payment_mode,
                    receipt_sender_name,
                    receipt_receiver_name,
                    receipt_cheque_number,
                )
            return invoice

    def update(self, instance, validated_data):
        desired_received_amount = validated_data.pop('received_amount', None)
        receipt_payment_mode = validated_data.pop('receipt_payment_mode', 'cash')
        receipt_sender_name = validated_data.pop('receipt_sender_name', None)
        receipt_receiver_name = validated_data.pop('receipt_receiver_name', None)
        receipt_cheque_number = validated_data.pop('receipt_cheque_number', None)
        should_mark_received = validated_data.get('received', instance.received)

        with transaction.atomic():
            for attr, value in validated_data.items():
                setattr(instance, attr, value)
            instance.full_clean()
            instance.save()
            if desired_received_amount is not None:
                self._sync_received_amount(
                    instance,
                    desired_received_amount,
                    validated_data.get('date', instance.date),
                    receipt_payment_mode,
                    receipt_sender_name,
                    receipt_receiver_name,
                    receipt_cheque_number,
                )
            else:
                self._sync_receipts(
                    instance,
                    should_mark_received,
                    validated_data.get('date', instance.date),
                    receipt_payment_mode,
                    receipt_sender_name,
                    receipt_receiver_name,
                    receipt_cheque_number,
                )
            return instance


class MiscellaneousExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = MiscellaneousExpense
        fields = [
            'id',
            'title',
            'paid_to_name',
            'amount',
            'date',
            'payment_mode',
            'notes',
        ]

    def create(self, validated_data):
        try:
            return MiscellaneousExpense.objects.create(**validated_data)
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


class OwnerPayoutSerializer(serializers.ModelSerializer):
    class Meta:
        model = OwnerPayout
        fields = [
            'id',
            'amount',
            'date',
            'payment_mode',
            'sender_name',
            'receiver_name',
            'cheque_number',
            'reference_number',
            'remarks',
        ]

    def validate(self, attrs):
        payment_mode = attrs.get('payment_mode', getattr(self.instance, 'payment_mode', 'cash'))

        payment_details = validate_payment_details(
            payment_mode=payment_mode,
            sender_name=attrs.get('sender_name', getattr(self.instance, 'sender_name', None)),
            receiver_name=attrs.get('receiver_name', getattr(self.instance, 'receiver_name', None)),
            cheque_number=attrs.get('cheque_number', getattr(self.instance, 'cheque_number', None)),
        )
        attrs['sender_name'] = payment_details['sender_name']
        attrs['receiver_name'] = payment_details['receiver_name']
        attrs['cheque_number'] = payment_details['cheque_number']

        if payment_details['errors']:
            raise serializers.ValidationError(payment_details['errors'])

        return attrs

    def create(self, validated_data):
        try:
            return OwnerPayout.objects.create(**validated_data)
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
