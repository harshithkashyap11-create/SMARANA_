from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("alerts", "0002_sosevent")]
    operations = [
        migrations.AddField(
            model_name="alert",
            name="notified",
            field=models.JSONField(blank=True, default=list),
        )
    ]
