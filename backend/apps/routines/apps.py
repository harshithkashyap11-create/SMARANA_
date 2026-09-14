from django.apps import AppConfig


class RoutinesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.routines"

    def ready(self) -> None:
        from apps.routines import signals  # noqa: F401
