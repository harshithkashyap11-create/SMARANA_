from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0005_doctorprofile")]
    operations = [
        migrations.AddField(
            model_name="devicesession",
            name="last_push_had_rejections",
            field=models.BooleanField(default=False),
        )
    ]
