from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor


def add_languages(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    language = apps.get_model("content", "Language")
    for code, name, native_name, locale in [
        ("hi", "Hindi", "हिन्दी", "hi-IN"),
        ("es", "Spanish", "Español", "es-ES"),
    ]:
        language.objects.using(schema_editor.connection.alias).get_or_create(
            code=code,
            defaults={
                "name": name,
                "native_name": native_name,
                "enabled": True,
                "tts_locale": locale,
            },
        )


class Migration(migrations.Migration):
    dependencies = [("content", "0002_seed_regions_languages_and_scaffolds")]
    operations = [migrations.RunPython(add_languages, migrations.RunPython.noop)]
