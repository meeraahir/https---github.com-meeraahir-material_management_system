from rest_framework import serializers

from .models import Party, Transaction


class PartySerializer(serializers.ModelSerializer):
    class Meta:
        model = Party
        fields = '__all__'


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = '__all__'

    def validate(self, attrs):
        amount = attrs.get('amount', getattr(self.instance, 'amount', 0))

        if amount < 0:
            raise serializers.ValidationError({'amount': 'Amount must be zero or positive.'})

        return attrs
