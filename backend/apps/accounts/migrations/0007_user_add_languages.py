from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0006_devicesession_last_push_had_rejections")]
    operations = [
        migrations.AlterField(
            model_name="user",
            name="language",
            field=models.CharField(
                choices=[
                    ("en", "English"),
                    ("as", "Assamese"),
                    ("bn", "Bengali"),
                    ("hi", "Hindi"),
                    ("es", "Spanish"),
                ],
                default="en",
                max_length=8,
            ),
        ),
    ]
