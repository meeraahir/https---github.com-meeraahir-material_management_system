import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def backfill_labour_payments(apps, schema_editor):
    LabourPayment = apps.get_model('labour', 'LabourPayment')
    LabourPaymentEntry = apps.get_model('labour', 'LabourPaymentEntry')

    for payment in LabourPayment.objects.exclude(paid_amount__lte=0):
        LabourPaymentEntry.objects.create(
            payment_id=payment.id,
            labour_id=payment.labour_id,
            site_id=payment.site_id,
            amount=payment.paid_amount,
            date=payment.date,
            notes='Backfilled from legacy paid_amount field.',
        )


class Migration(migrations.Migration):

    dependencies = [
        ('labour', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='labour',
            name='per_day_wage',
            field=models.DecimalField(decimal_places=2, max_digits=14),
        ),
        migrations.AlterField(
            model_name='labourpayment',
            name='total_amount',
            field=models.DecimalField(decimal_places=2, max_digits=14),
        ),
        migrations.AlterField(
            model_name='labourpayment',
            name='paid_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name='labourpayment',
            name='date',
            field=models.DateField(default=django.utils.timezone.now),
        ),
        migrations.AddField(
            model_name='labourpayment',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='labourpayment',
            name='period_end',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='labourpayment',
            name='period_start',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='labourpayment',
            name='site',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='sites.site'),
        ),
        migrations.CreateModel(
            name='LabourPaymentEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('date', models.DateField(default=django.utils.timezone.now)),
                ('notes', models.TextField(blank=True, null=True)),
                ('labour', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='labour.labour')),
                ('payment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payment_entries', to='labour.labourpayment')),
                ('site', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='sites.site')),
            ],
            options={
                'ordering': ['date', 'id'],
            },
        ),
        migrations.AddConstraint(
            model_name='labourattendance',
            constraint=models.UniqueConstraint(fields=('labour', 'site', 'date'), name='unique_labour_attendance_per_site_day'),
        ),
        migrations.RunPython(backfill_labour_payments, migrations.RunPython.noop),
    ]
