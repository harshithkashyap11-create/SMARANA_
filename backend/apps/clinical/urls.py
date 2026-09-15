from django.urls import path

from apps.clinical.views import PatientNoteList

urlpatterns = [path("patients/<uuid:patient_id>/notes/", PatientNoteList.as_view())]
