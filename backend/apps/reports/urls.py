from django.urls import path

from apps.reports.views import EmergencyCardView, ReportView

urlpatterns = [
    path("patients/<uuid:patient_id>/report/", ReportView.as_view()),
    path("patients/<uuid:patient_id>/emergency-card/", EmergencyCardView.as_view()),
]
