import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("patients", "0003_patientprofile_accessibility_and_more"),
    ]
    operations = [
        migrations.CreateModel(
            name="ClinicalNote",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "category",
                    models.CharField(
                        choices=[
                            ("caregiver_feedback", "Caregiver feedback"),
                            ("observation", "Observation"),
                            ("follow_up", "Follow-up"),
                        ],
                        max_length=32,
                    ),
                ),
                (
                    "visibility",
                    models.CharField(
                        choices=[
                            ("care_team", "Care team"),
                            ("patient_visible", "Patient visible"),
                            ("doctor_only", "Doctor only"),
                        ],
                        default="care_team",
                        max_length=32,
                    ),
                ),
                ("text", models.TextField()),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="clinical_notes",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="clinical_notes",
                        to="patients.patientprofile",
                    ),
                ),
            ],
            options={"ordering": ["-created_at", "id"]},
        )
    ]
