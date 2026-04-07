from rest_framework import serializers

from .models import Labour, LabourAttendance, LabourPayment


class LabourSerializer(serializers.ModelSerializer):
    class Meta:
        model = Labour
        fields = '__all__'


class LabourAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabourAttendance
        fields = '__all__'


class LabourPaymentSerializer(serializers.ModelSerializer):
    pending_amount = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = LabourPayment
        fields = [
            'id',
            'labour',
            'total_amount',
            'paid_amount',
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
