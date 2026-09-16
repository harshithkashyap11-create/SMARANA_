from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("patients", "0004_accessibility_updated_at")]
    operations = [
        migrations.AddField(
            model_name="patientprofile",
            name="favourites",
            field=models.JSONField(default=list, blank=True),
        ),
        migrations.AddField(
            model_name="patientprofile",
            name="favourites_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
