from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('settings', '0002_appconfig_step_and_more'),
    ]

    operations = [
        migrations.RemoveField(model_name='appconfig', name='oci_tenancy_ocid'),
        migrations.RemoveField(model_name='appconfig', name='oci_user_ocid'),
        migrations.RemoveField(model_name='appconfig', name='oci_key_fingerprint'),
        migrations.RemoveField(model_name='appconfig', name='oci_private_key'),
        migrations.RemoveField(model_name='appconfig', name='oci_region'),
        migrations.RemoveField(model_name='appconfig', name='oci_compartment_ocid'),
        migrations.RemoveField(model_name='appconfig', name='oci_bucket_name'),
        migrations.RemoveField(model_name='appconfig', name='oci_bucket_namespace'),
        migrations.RemoveField(model_name='appconfig', name='oci_sender_email'),
        migrations.AddField(
            model_name='appconfig',
            name='passbolt_resource_id',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
