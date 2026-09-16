from django.urls import path

from apps.alerts.views import (
    AlertAcknowledgeView,
    AlertDismissView,
    AlertForwardView,
    AlertListView,
    CheckInView,
    NotificationPreferenceDetailView,
    NotificationPreferenceListView,
    PatientSosView,
    SosAcknowledgeView,
)

urlpatterns = [
    path("patients/<uuid:patient_id>/sos/", PatientSosView.as_view()),
    path("sos/<uuid:sos_id>/acknowledge/", SosAcknowledgeView.as_view()),
    path("alerts/", AlertListView.as_view()),
    path("alerts/<uuid:alert_id>/acknowledge/", AlertAcknowledgeView.as_view()),
    path("alerts/<uuid:alert_id>/forward/", AlertForwardView.as_view()),
    path("alerts/<uuid:alert_id>/dismiss/", AlertDismissView.as_view()),
]


urlpatterns += [
    path("notification-preferences/", NotificationPreferenceListView.as_view()),
    path(
        "notification-preferences/<uuid:preference_id>/", NotificationPreferenceDetailView.as_view()
    ),
    path("patients/<uuid:patient_id>/checkins/", CheckInView.as_view()),
]
