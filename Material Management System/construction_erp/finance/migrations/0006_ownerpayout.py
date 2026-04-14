import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0005_transaction_description_transaction_phase_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='OwnerPayout',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('date', models.DateField(default=django.utils.timezone.now)),
                ('payment_mode', models.CharField(choices=[('cash', 'Cash'), ('check', 'Check'), ('bank_transfer', 'Bank Transfer'), ('upi', 'UPI'), ('other', 'Other')], default='cash', max_length=20)),
                ('sender_name', models.CharField(blank=True, max_length=255, null=True)),
                ('receiver_name', models.CharField(blank=True, max_length=255, null=True)),
                ('cheque_number', models.CharField(blank=True, max_length=50, null=True)),
                ('reference_number', models.CharField(blank=True, max_length=50, null=True)),
                ('remarks', models.TextField(blank=True, null=True)),
            ],
            options={
                'ordering': ['-date', '-id'],
            },
        ),
    ]
