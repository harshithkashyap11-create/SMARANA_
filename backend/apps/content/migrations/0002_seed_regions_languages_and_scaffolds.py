from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.apps.registry import Apps
from django.db import migrations


REGIONS = [
    ("AS", "Assam"),
    ("AR", "Arunachal Pradesh"),
    ("MN", "Manipur"),
    ("ML", "Meghalaya"),
    ("MZ", "Mizoram"),
    ("NL", "Nagaland"),
    ("SK", "Sikkim"),
    ("TR", "Tripura"),
]
LANGUAGES = [
    ("en", "English", "English", True, "en-IN", ""),
    ("as", "Assamese", "অসমীয়া", True, "bn-IN", "Noto Sans Bengali"),
    ("bn", "Bengali", "বাংলা", True, "bn-IN", "Noto Sans Bengali"),
    ("mni", "Manipuri", "ꯃꯤꯇꯩꯂꯣꯟ", False, "", "Noto Sans Meetei Mayek"),
    ("kha", "Khasi", "Khasi", False, "", ""),
    ("lus", "Mizo", "Mizo", False, "", ""),
]
TARGETS = {
    "place": 20,
    "festival": 8,
    "dish": 10,
    "tune": 5,
    "activity": 6,
    "sound": 8,
    "word": 40,
    "routine_scene": 4,
}


def seed(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    del schema_editor
    Region = apps.get_model("content", "Region")
    Language = apps.get_model("content", "Language")
    ContentItem = apps.get_model("content", "ContentItem")
    for code, name in REGIONS:
        region, _ = Region.objects.get_or_create(code=code, defaults={"name": name})
        for kind, target in TARGETS.items():
            count = target if code in {"AS", "ML"} else 5
            for number in range(1, count + 1):
                ContentItem.objects.get_or_create(
                    region=region,
                    kind=kind,
                    title=f"{name} {kind.replace('_', ' ')} {number}",
                    defaults={
                        "title_translations": {},
                        "tags": {
                            "attribution": "Seed scaffold; rights review required",
                            "generic": code not in {"AS", "ML"},
                        },
                        "review_status": "reviewed",
                    },
                )
    for code, name, native_name, enabled, tts_locale, font_family in LANGUAGES:
        Language.objects.get_or_create(
            code=code,
            defaults={
                "name": name,
                "native_name": native_name,
                "enabled": enabled,
                "tts_locale": tts_locale,
                "font_family": font_family,
            },
        )


class Migration(migrations.Migration):
    dependencies = [("content", "0001_initial")]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
