from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("patients", "0003_patientprofile_accessibility_and_more")]
    operations = [migrations.AddField(
        model_name="patientprofile", name="accessibility_updated_at",
        field=models.DateTimeField(blank=True, null=True),
    )]
