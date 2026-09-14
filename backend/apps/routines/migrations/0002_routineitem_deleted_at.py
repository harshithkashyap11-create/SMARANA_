from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("routines", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="routineitem",
            name="deleted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
