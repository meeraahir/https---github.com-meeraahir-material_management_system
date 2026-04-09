from django.db import migrations, models


def force_admin_role(apps, schema_editor):
    User = apps.get_model('accounts', 'User')
    User.objects.exclude(role='admin').update(role='admin')


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(choices=[('admin', 'Admin')], default='admin', max_length=20),
        ),
        migrations.RunPython(force_admin_role, migrations.RunPython.noop),
    ]
