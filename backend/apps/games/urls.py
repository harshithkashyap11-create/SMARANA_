from django.urls import path

from apps.games.views import GameList, PatientDifficultyChangeList, PatientGameSessionList

urlpatterns = [
    path("games/", GameList.as_view()),
    path("patients/<uuid:patient_id>/game-sessions/", PatientGameSessionList.as_view()),
    path("patients/<uuid:patient_id>/difficulty-changes/", PatientDifficultyChangeList.as_view()),
]
