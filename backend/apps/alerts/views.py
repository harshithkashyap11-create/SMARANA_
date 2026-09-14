from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.alerts.models import SosEvent
from apps.alerts.services import create_sos
from apps.patients.selectors import patients_for


class PatientSosView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, patient_id: str) -> Response:
        patient = get_object_or_404(
            patients_for(request.user).filter(user=request.user), id=patient_id
        )
        key = request.data.get("idempotency_key")
        if not key:
            return Response(
                {"idempotency_key": ["This field is required."]}, status=status.HTTP_400_BAD_REQUEST
            )
        event, created = create_sos(
            patient=patient,
            idempotency_key=str(key),
            location_text=str(request.data.get("location_text", "")),
        )
        return Response(
            {"id": str(event.id), "notified": event.notified},
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class SosAcknowledgeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, sos_id: str) -> Response:
        if request.user.role != User.Role.CAREGIVER:
            return Response(status=status.HTTP_404_NOT_FOUND)
        event = get_object_or_404(
            SosEvent.objects.filter(
                patient__care_assignments__caregiver=request.user,
                patient__care_assignments__active=True,
            ),
            id=sos_id,
        )
        event.acknowledged_by = request.user
        event.acknowledged_at = timezone.now()
        event.resolution_note = str(request.data.get("note", ""))
        event.save(
            update_fields=["acknowledged_by", "acknowledged_at", "resolution_note", "updated_at"]
        )
        event.patient.alerts.filter(evidence__sos_event_id=str(event.id)).update(
            status="acknowledged",
            acknowledged_by=request.user,
            acknowledged_at=event.acknowledged_at,
        )
        return Response({"id": str(event.id), "status": "acknowledged"})
