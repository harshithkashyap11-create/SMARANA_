from django.db import migrations


def update_languages(apps, schema_editor):
    language = apps.get_model("content", "Language")
    language.objects.using(schema_editor.connection.alias).filter(code="es").update(enabled=False)
    for code, name, native in [
        ("te", "Telugu", "తెలుగు"),
        ("mni", "Manipuri", "ꯃꯤꯇꯩꯂꯣꯟ"),
        ("lus", "Mizo", "Mizo"),
    ]:
        language.objects.using(schema_editor.connection.alias).update_or_create(
            code=code,
            defaults={
                "name": name,
                "native_name": native,
                "enabled": True,
                "tts_locale": f"{code}-IN",
            },
        )
    user = apps.get_model("accounts", "User")
    user.objects.using(schema_editor.connection.alias).filter(language="es").update(language="en")


class Migration(migrations.Migration):
    dependencies = [("content", "0003_add_hindi_spanish"), ("accounts", "0008_alter_user_language")]
    operations = [migrations.RunPython(update_languages, migrations.RunPython.noop)]
