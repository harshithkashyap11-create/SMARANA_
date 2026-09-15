from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.memories.models import Memory
from apps.memories.serializers import (
    AttemptInputSerializer,
    MemoryCreateSerializer,
    MemoryMediaInputSerializer,
    MemoryMediaSerializer,
    MemorySerializer,
)
from apps.memories.services import add_memory_media, create_memory, next_question, record_attempt
from apps.patients.selectors import patients_for


class PatientMemoryList(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, patient_id: str) -> Response:
        patient = get_object_or_404(patients_for(request.user), id=patient_id)
        queryset = Memory.objects.filter(patient=patient).prefetch_related("people", "media")
        if request.user.role == User.Role.DOCTOR:
            consent = getattr(patient, "consent", None)
            queryset = (
                queryset.filter(visibility=Memory.Visibility.CARE_TEAM)
                if consent and consent.share_memories_with_doctor
                else queryset.none()
            )
        return Response(MemorySerializer(queryset, many=True).data)

    def post(self, request: Request, patient_id: str) -> Response:
        if request.user.role != User.Role.CAREGIVER:
            raise PermissionDenied("Only caregivers can add memories.")
        patient = get_object_or_404(patients_for(request.user), id=patient_id)
        serializer = MemoryCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media_rows: list[dict[str, object]] = []
        for order, uploaded in enumerate(request.FILES.getlist("photos")):
            media_serializer = MemoryMediaInputSerializer(data={"file": uploaded, "order": order})
            media_serializer.is_valid(raise_exception=True)
            media_rows.append(dict(media_serializer.validated_data))
        memory = create_memory(
            patient=patient, actor=request.user, data=dict(serializer.validated_data)
        )
        for media_data in media_rows:
            add_memory_media(memory=memory, actor=request.user, data=media_data)
        memory.refresh_from_db()
        return Response(MemorySerializer(memory).data, status=status.HTTP_201_CREATED)


class PatientMemoryDetail(PatientMemoryList):
    def get(self, request: Request, patient_id: str, memory_id: str) -> Response:
        response = super().get(request, patient_id)
        memory = next((item for item in response.data if str(item["id"]) == memory_id), None)
        if memory is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(memory)


class PatientMemoryMedia(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, patient_id: str, memory_id: str) -> Response:
        if request.user.role != User.Role.CAREGIVER:
            raise PermissionDenied("Only caregivers can add memory photos.")
        patient = get_object_or_404(patients_for(request.user), id=patient_id)
        memory = get_object_or_404(Memory.objects.filter(patient=patient), id=memory_id)
        serializer = MemoryMediaInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        media = add_memory_media(
            memory=memory, actor=request.user, data=dict(serializer.validated_data)
        )
        return Response(MemoryMediaSerializer(media).data, status=status.HTTP_201_CREATED)


class NextQuizQuestion(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, patient_id: str) -> Response:
        patient = get_object_or_404(
            patients_for(request.user).filter(user=request.user), id=patient_id
        )
        return Response(next_question(patient))


class QuizAttemptList(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request: Request, patient_id: str) -> Response:
        patient = get_object_or_404(
            patients_for(request.user).filter(user=request.user), id=patient_id
        )
        serializer = AttemptInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attempt, created = record_attempt(patient=patient, data=dict(serializer.validated_data))
        return Response(
            {
                "id": str(attempt.id),
                "feedback_key": "quiz.correct" if attempt.correct else "quiz.saved_as",
                "expected_label": attempt.expected,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )
