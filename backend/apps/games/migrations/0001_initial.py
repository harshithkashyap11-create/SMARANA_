from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.apps.registry import Apps

# Generated for the Smārana games engine.
import uuid

import django.db.models.deletion
from django.db import migrations, models


METRICS_SCHEMA = {
    "required": [
        "accuracy",
        "mean_reaction_ms",
        "mistakes",
        "hints_used",
        "rounds",
        "duration_ms",
        "completed",
        "abandoned_reason",
        "fatigue_flags",
    ]
}
GAMES = [
    ("memory_match", "Memory Match", ["memory", "attention"], True),
    ("sequence_recall", "Sequence Recall", ["memory", "sequencing"], True),
    ("object_sorting", "Object Sorting", ["recognition", "attention"], True),
    ("tea_garden_attention", "Tea Garden Attention", ["attention"], True),
    ("bihu_rhythm_recall", "Bihu Rhythm Recall", ["memory", "sequencing"], True),
    ("daily_life_sequencing", "Daily Life Sequencing", ["routine", "sequencing"], True),
]


def seed_games(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    game = apps.get_model("games", "GameDefinition")
    for key, name, domains, regional in GAMES:
        game.objects.update_or_create(
            key=key,
            defaults={
                "name": name,
                "cognitive_domains": domains,
                "min_level": 1,
                "max_level": 10,
                "is_regional": regional,
                "metrics_schema": METRICS_SCHEMA,
            },
        )


class Migration(migrations.Migration):
    initial = True
    dependencies = [("patients", "0003_patientprofile_accessibility_and_more")]
    operations = [
        migrations.CreateModel(
            name="GameDefinition",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("key", models.SlugField(max_length=64, unique=True)),
                ("name", models.CharField(max_length=128)),
                ("cognitive_domains", models.JSONField(default=list)),
                ("min_level", models.PositiveSmallIntegerField(default=1)),
                ("max_level", models.PositiveSmallIntegerField(default=10)),
                ("is_regional", models.BooleanField(default=False)),
                ("metrics_schema", models.JSONField(default=dict)),
                ("active", models.BooleanField(default=True)),
            ],
            options={"ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="DifficultyState",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("level", models.PositiveSmallIntegerField()),
                ("window", models.JSONField(default=list)),
                ("locked_by_doctor", models.BooleanField(default=False)),
                ("locked_by_name", models.CharField(blank=True, max_length=128)),
                ("cap_level", models.PositiveSmallIntegerField(blank=True, null=True)),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="difficulty_states",
                        to="games.gamedefinition",
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="difficulty_states",
                        to="patients.patientprofile",
                    ),
                ),
            ],
        ),
        migrations.CreateModel(
            name="GameSession",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("seed", models.CharField(max_length=64)),
                ("level", models.PositiveSmallIntegerField()),
                ("metrics", models.JSONField(default=dict)),
                ("challenge_mode", models.BooleanField(default=False)),
                ("guest_mode", models.BooleanField(default=False)),
                ("started_at", models.DateTimeField()),
                ("ended_at", models.DateTimeField()),
                (
                    "game",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="sessions",
                        to="games.gamedefinition",
                    ),
                ),
                (
                    "patient",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="game_sessions",
                        to="patients.patientprofile",
                    ),
                ),
            ],
            options={"ordering": ["-ended_at", "id"]},
        ),
        migrations.CreateModel(
            name="DifficultyChange",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("from_level", models.PositiveSmallIntegerField()),
                ("to_level", models.PositiveSmallIntegerField()),
                ("reason_code", models.CharField(max_length=32)),
                ("explanation", models.TextField()),
                (
                    "session",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="difficulty_changes",
                        to="games.gamesession",
                    ),
                ),
                (
                    "state",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="changes",
                        to="games.difficultystate",
                    ),
                ),
            ],
            options={"ordering": ["-created_at", "id"]},
        ),
        migrations.AddConstraint(
            model_name="difficultystate",
            constraint=models.UniqueConstraint(
                fields=("patient", "game"), name="unique_patient_game_difficulty"
            ),
        ),
        migrations.RunPython(seed_games, migrations.RunPython.noop),
    ]
