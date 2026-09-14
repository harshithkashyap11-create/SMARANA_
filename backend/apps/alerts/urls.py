from django.urls import path

from apps.alerts.views import PatientSosView, SosAcknowledgeView

urlpatterns = [
    path("patients/<uuid:patient_id>/sos/", PatientSosView.as_view()),
    path("sos/<uuid:sos_id>/acknowledge/", SosAcknowledgeView.as_view()),
]
