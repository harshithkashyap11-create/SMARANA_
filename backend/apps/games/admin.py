from django.contrib import admin

from apps.games.models import DifficultyChange, DifficultyState, GameDefinition, GameSession

admin.site.register(GameDefinition)
admin.site.register(GameSession)
admin.site.register(DifficultyState)
admin.site.register(DifficultyChange)
