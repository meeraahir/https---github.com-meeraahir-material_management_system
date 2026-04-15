from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
        ]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False, default='admin')

    class Meta:
        model = User
        fields = [
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'password',
            'password2',
        ]
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate_username(self, value):
        normalized = value.strip()
        if not normalized:
            raise serializers.ValidationError('Username is required.')
        return normalized

    def validate_email(self, value):
        normalized = value.strip().lower()
        if not normalized:
            raise serializers.ValidationError('Email is required.')
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return normalized

    def validate(self, attrs):
        if attrs.get('password') != attrs.get('password2'):
            raise serializers.ValidationError({'password': "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2', None)
        password = validated_data.pop('password')
        validated_data['role'] = validated_data.get('role') or 'admin'
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    confirm_password = serializers.CharField(write_only=True)

    def validate_email(self, value):
        normalized = value.strip().lower()
        user = User.objects.filter(email__iexact=normalized).first()

        if user is None:
            raise serializers.ValidationError('No user found with this email address.')

        self.context['forgot_password_user'] = user
        return normalized

    def validate(self, attrs):
        if attrs.get('new_password') != attrs.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return attrs

    def save(self, **kwargs):
        user = self.context['forgot_password_user']
        user.set_password(self.validated_data['new_password'])
        user.save(update_fields=['password'])
        return user


class EmailOrUsernameTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_field = self.username_field
        login_value = attrs.get(username_field)

        if isinstance(login_value, str):
            login_value = login_value.strip()
            attrs[username_field] = login_value

            user = None
            if login_value:
                if '@' in login_value:
                    user = User.objects.filter(email__iexact=login_value).first()
                else:
                    user = User.objects.filter(username=login_value).first()
                    if user is None:
                        user = User.objects.filter(email__iexact=login_value).first()

            if user is not None:
                attrs[username_field] = user.get_username()

        return super().validate(attrs)
