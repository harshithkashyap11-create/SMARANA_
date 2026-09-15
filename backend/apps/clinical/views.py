from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.clinical.models import ClinicalNote
from apps.clinical.serializers import ClinicalNoteSerializer
from apps.clinical.services import create_note
from apps.patients.selectors import patients_for


class PatientNoteList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, patient_id: str) -> Response:
        patient = get_object_or_404(patients_for(request.user), id=patient_id)
        rows = ClinicalNote.objects.filter(patient=patient).select_related("author")
        if request.user.role == User.Role.CAREGIVER:
            rows = rows.exclude(visibility=ClinicalNote.Visibility.DOCTOR_ONLY)
        elif request.user.role == User.Role.PATIENT:
            rows = rows.filter(visibility=ClinicalNote.Visibility.PATIENT_VISIBLE)
        return Response(ClinicalNoteSerializer(rows, many=True).data)

    def post(self, request: Request, patient_id: str) -> Response:
        if request.user.role not in {User.Role.CAREGIVER, User.Role.DOCTOR}:
            return Response(status=status.HTTP_404_NOT_FOUND)
        patient = get_object_or_404(patients_for(request.user), id=patient_id)
        serializer = ClinicalNoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        note = create_note(
            patient=patient, actor=request.user, data=dict(serializer.validated_data)
        )
        return Response(ClinicalNoteSerializer(note).data, status=status.HTTP_201_CREATED)
