from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor

GAMES = [
    ("sequence_recall", "Sequence Recall", ["memory"]),
    ("memory_match", "Memory Match", ["memory"]),
    ("find_the_change", "Find the Change", ["attention"]),
    ("object_sorting", "Object Sorting", ["reasoning"]),
    ("daily_routine", "Daily Routine Builder", ["reasoning"]),
    ("word_recall", "Word Recall", ["memory"]),
    ("visual_search", "Visual Search", ["attention"]),
    ("pattern_completion", "Pattern Completion", ["reasoning"]),
    ("spatial_recall", "Spatial Recall", ["visuospatial"]),
    ("attention_tap", "Attention Tap", ["attention"]),
    ("association_game", "Association Game", ["associative"]),
    ("personal_memory", "Personal Memory Recall", ["personal"]),
]


def seed(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    Game = apps.get_model("games", "GameDefinition")
    State = apps.get_model("games", "DifficultyState")
    for key, name, domains in GAMES:
        game, created = Game.objects.get_or_create(
            key=key, defaults={"name": name, "cognitive_domains": domains, "max_level": 5}
        )
        game.name, game.cognitive_domains, game.max_level = name, domains, 5
        game.save(update_fields=["name", "cognitive_domains", "max_level"])
        State.objects.filter(game=game, level__gt=5).update(level=5, window=[])


class Migration(migrations.Migration):
    dependencies = [("games", "0004_remaining_games")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
