from django.urls import path

from apps.games.views import GameList, PatientGameSessionList

urlpatterns = [
    path("games/", GameList.as_view()),
    path("patients/<uuid:patient_id>/game-sessions/", PatientGameSessionList.as_view()),
]
