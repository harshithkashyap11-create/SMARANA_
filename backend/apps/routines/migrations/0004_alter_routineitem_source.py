from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [("routines", "0003_alter_routineitem_managers")]
    operations = [migrations.AlterField(model_name="routineitem", name="source", field=models.CharField(choices=[("caregiver", "Caregiver"), ("doctor", "Doctor"), ("system", "System"), ("patient", "Patient")], max_length=16))]
