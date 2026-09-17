from django.contrib import admin
from django.http import HttpRequest

from apps.games.models import DifficultyChange, DifficultyState, GameDefinition, GameSession


@admin.register(GameDefinition)
class GameDefinitionAdmin(admin.ModelAdmin[GameDefinition]):
    list_display = ("name", "key", "active", "max_level", "is_regional", "regions")
    list_editable = ("active", "max_level")
    list_filter = ("active", "is_regional")


admin.site.register(GameSession)


@admin.register(DifficultyState)
class DifficultyStateAdmin(admin.ModelAdmin[DifficultyState]):
    readonly_fields = (
        "patient",
        "game",
        "level",
        "window",
        "locked_by_doctor",
        "locked_by_name",
        "cap_level",
    )

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(
        self, request: HttpRequest, obj: DifficultyState | None = None
    ) -> bool:
        return False


admin.site.register(DifficultyChange)
