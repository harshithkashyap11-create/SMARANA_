from django.db import migrations


def seed(apps, schema_editor):
    Game = apps.get_model("games", "GameDefinition")
    Game.objects.update_or_create(
        key="who_is_this",
        defaults={
            "name": "Who Is This?",
            "cognitive_domains": ["recognition"],
            "min_level": 1,
            "max_level": 10,
            "is_regional": False,
            "metrics_schema": {},
        },
    )
    Game.objects.update_or_create(
        key="word_pairs",
        defaults={
            "name": "Word Pairs",
            "cognitive_domains": ["memory", "language"],
            "min_level": 1,
            "max_level": 10,
            "is_regional": False,
            "metrics_schema": {},
        },
    )
    Game.objects.update_or_create(
        key="festival_calendar",
        defaults={
            "name": "Festival Match",
            "cognitive_domains": ["recognition", "memory"],
            "min_level": 1,
            "max_level": 10,
            "is_regional": True,
            "metrics_schema": {},
        },
    )
    Game.objects.update_or_create(
        key="sound_match",
        defaults={
            "name": "Sound Match",
            "cognitive_domains": ["recognition", "memory"],
            "min_level": 1,
            "max_level": 10,
            "is_regional": True,
            "metrics_schema": {},
        },
    )
    Game.objects.update_or_create(
        key="spot_the_change",
        defaults={
            "name": "Spot the Change",
            "cognitive_domains": ["attention"],
            "min_level": 1,
            "max_level": 10,
            "is_regional": True,
            "metrics_schema": {},
        },
    )


class Migration(migrations.Migration):
    dependencies = [("games", "0003_seed_familiar_place_recall")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
