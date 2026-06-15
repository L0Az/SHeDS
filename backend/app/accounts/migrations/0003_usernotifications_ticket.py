import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_initial"),
        ("helpdesk", "0002_replace_filefield_with_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="usernotifications",
            name="ticket",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="notifications",
                to="helpdesk.ticket",
            ),
        ),
    ]
