import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def backfill_vendor_payments(apps, schema_editor):
    VendorTransaction = apps.get_model('vendors', 'VendorTransaction')
    VendorPayment = apps.get_model('vendors', 'VendorPayment')

    for purchase in VendorTransaction.objects.exclude(paid_amount__lte=0):
        VendorPayment.objects.create(
            purchase_id=purchase.id,
            vendor_id=purchase.vendor_id,
            site_id=purchase.site_id,
            amount=purchase.paid_amount,
            date=purchase.date,
            reference_number=purchase.invoice_number,
            remarks='Backfilled from legacy paid_amount field.',
        )


class Migration(migrations.Migration):

    dependencies = [
        ('vendors', '0004_vendor_aadhar_number_vendor_pan_number'),
    ]

    operations = [
        migrations.AlterField(
            model_name='vendortransaction',
            name='total_amount',
            field=models.DecimalField(decimal_places=2, max_digits=14),
        ),
        migrations.AlterField(
            model_name='vendortransaction',
            name='paid_amount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.CreateModel(
            name='VendorPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('date', models.DateField(default=django.utils.timezone.now)),
                ('reference_number', models.CharField(blank=True, max_length=50, null=True)),
                ('remarks', models.TextField(blank=True, null=True)),
                ('purchase', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='vendors.vendortransaction')),
                ('site', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='sites.site')),
                ('vendor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='vendors.vendor')),
            ],
            options={
                'ordering': ['date', 'id'],
            },
        ),
        migrations.RunPython(backfill_vendor_payments, migrations.RunPython.noop),
    ]
