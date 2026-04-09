import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def backfill_client_receipts(apps, schema_editor):
    Transaction = apps.get_model('finance', 'Transaction')
    ClientReceipt = apps.get_model('finance', 'ClientReceipt')

    for invoice in Transaction.objects.filter(received=True).exclude(amount__lte=0):
        ClientReceipt.objects.create(
            invoice_id=invoice.id,
            party_id=invoice.party_id,
            site_id=invoice.site_id,
            amount=invoice.amount,
            date=invoice.date,
            notes='Backfilled from legacy received flag.',
        )


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='transaction',
            name='amount',
            field=models.DecimalField(decimal_places=2, max_digits=14),
        ),
        migrations.AlterField(
            model_name='transaction',
            name='date',
            field=models.DateField(default=django.utils.timezone.now),
        ),
        migrations.CreateModel(
            name='ClientReceipt',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=14)),
                ('date', models.DateField(default=django.utils.timezone.now)),
                ('reference_number', models.CharField(blank=True, max_length=50, null=True)),
                ('notes', models.TextField(blank=True, null=True)),
                ('invoice', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='receipts', to='finance.transaction')),
                ('party', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='finance.party')),
                ('site', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='sites.site')),
            ],
            options={
                'ordering': ['date', 'id'],
            },
        ),
        migrations.RunPython(backfill_client_receipts, migrations.RunPython.noop),
    ]
