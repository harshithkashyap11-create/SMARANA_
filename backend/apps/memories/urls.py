from django.urls import path

from apps.memories.views import (
    NextQuizQuestion,
    PatientMemoryDetail,
    PatientMemoryList,
    PatientMemoryMedia,
    QuizAttemptList,
)

urlpatterns = [
    path("patients/<uuid:patient_id>/memories/", PatientMemoryList.as_view()),
    path("patients/<uuid:patient_id>/memories/<uuid:memory_id>/", PatientMemoryDetail.as_view()),
    path(
        "patients/<uuid:patient_id>/memories/<uuid:memory_id>/media/", PatientMemoryMedia.as_view()
    ),
    path("patients/<uuid:patient_id>/memory-quiz/next/", NextQuizQuestion.as_view()),
    path("patients/<uuid:patient_id>/memory-quiz/attempts/", QuizAttemptList.as_view()),
]
