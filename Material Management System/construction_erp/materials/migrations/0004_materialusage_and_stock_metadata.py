import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


def backfill_material_usage(apps, schema_editor):
    MaterialStock = apps.get_model('materials', 'MaterialStock')
    MaterialUsage = apps.get_model('materials', 'MaterialUsage')

    for stock in MaterialStock.objects.exclude(quantity_used__lte=0):
        MaterialUsage.objects.create(
            receipt_id=stock.id,
            site_id=stock.site_id,
            material_id=stock.material_id,
            quantity=stock.quantity_used,
            date=stock.date,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('materials', '0003_alter_material_options_alter_material_name_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='materialstock',
            name='invoice_number',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='materialstock',
            name='notes',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='materialstock',
            name='quantity_received',
            field=models.DecimalField(decimal_places=3, default=0, max_digits=14),
        ),
        migrations.AlterField(
            model_name='materialstock',
            name='quantity_used',
            field=models.DecimalField(decimal_places=3, default=0, max_digits=14),
        ),
        migrations.AlterField(
            model_name='materialstock',
            name='cost_per_unit',
            field=models.DecimalField(decimal_places=2, max_digits=14),
        ),
        migrations.AlterField(
            model_name='materialstock',
            name='transport_cost',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AlterField(
            model_name='materialstock',
            name='date',
            field=models.DateField(default=django.utils.timezone.now),
        ),
        migrations.CreateModel(
            name='MaterialUsage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.DecimalField(decimal_places=3, max_digits=14)),
                ('date', models.DateField(default=django.utils.timezone.now)),
                ('notes', models.TextField(blank=True, null=True)),
                ('material', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='materials.material')),
                ('receipt', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='usage_entries', to='materials.materialstock')),
                ('site', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='sites.site')),
            ],
            options={
                'ordering': ['date', 'id'],
            },
        ),
        migrations.RunPython(backfill_material_usage, migrations.RunPython.noop),
    ]
