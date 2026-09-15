from django.urls import path

from apps.clinical.views import (
    DoctorDashboard,
    PatientAssignmentDetail,
    PatientAssignmentList,
    PatientBaseline,
    PatientDifficulty,
    PatientDifficultyOverride,
    PatientDoctorRoutine,
    PatientMedicationDetail,
    PatientMedicationList,
    PatientMetrics,
    PatientNoteDetail,
    PatientNoteList,
)

urlpatterns = [
    path("doctor/dashboard/", DoctorDashboard.as_view()),
    path("patients/<uuid:patient_id>/notes/", PatientNoteList.as_view()),
    path("patients/<uuid:patient_id>/notes/<uuid:note_id>/", PatientNoteDetail.as_view()),
    path("patients/<uuid:patient_id>/baseline/", PatientBaseline.as_view()),
    path("patients/<uuid:patient_id>/metrics/", PatientMetrics.as_view()),
    path("patients/<uuid:patient_id>/medications/", PatientMedicationList.as_view()),
    path(
        "patients/<uuid:patient_id>/medications/<uuid:medication_id>/",
        PatientMedicationDetail.as_view(),
    ),
    path("patients/<uuid:patient_id>/difficulty/", PatientDifficulty.as_view()),
    path(
        "patients/<uuid:patient_id>/difficulty/<slug:game_key>/override/",
        PatientDifficultyOverride.as_view(),
    ),
    path("patients/<uuid:patient_id>/assignments/", PatientAssignmentList.as_view()),
    path(
        "patients/<uuid:patient_id>/assignments/<uuid:assignment_id>/",
        PatientAssignmentDetail.as_view(),
    ),
    path("patients/<uuid:patient_id>/doctor-routine/", PatientDoctorRoutine.as_view()),
]
