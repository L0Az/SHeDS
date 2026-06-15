from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0003_appconfig_passbolt_resource_id'),
    ]

    operations = [
        migrations.RemoveField(model_name='appconfig', name='passbolt_resource_id'),
    ]
