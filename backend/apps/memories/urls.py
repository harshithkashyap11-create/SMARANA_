from django.urls import path

from apps.memories.views import (
    NextQuizQuestion,
    PatientMemoryDetail,
    PatientMemoryList,
    QuizAttemptList,
)

urlpatterns = [
    path("patients/<uuid:patient_id>/memories/", PatientMemoryList.as_view()),
    path("patients/<uuid:patient_id>/memories/<uuid:memory_id>/", PatientMemoryDetail.as_view()),
    path("patients/<uuid:patient_id>/memory-quiz/next/", NextQuizQuestion.as_view()),
    path("patients/<uuid:patient_id>/memory-quiz/attempts/", QuizAttemptList.as_view()),
]
