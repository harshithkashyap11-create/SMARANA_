from django.db import migrations


def seed(apps, schema_editor):
    del schema_editor
    GameDefinition = apps.get_model("games", "GameDefinition")
    GameDefinition.objects.update_or_create(
        key="familiar_place_recall",
        defaults={"name": "Familiar Place Recall", "cognitive_domains": ["memory", "recognition"], "min_level": 1, "max_level": 10, "is_regional": True, "metrics_schema": {}},
    )


class Migration(migrations.Migration):
    dependencies = [("games", "0002_gamedefinition_regions")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
