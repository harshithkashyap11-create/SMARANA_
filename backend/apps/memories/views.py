from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.memories.models import Memory
from apps.memories.serializers import AttemptInputSerializer, MemorySerializer
from apps.memories.services import next_question, record_attempt
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


class PatientMemoryDetail(PatientMemoryList):
    def get(self, request: Request, patient_id: str, memory_id: str) -> Response:
        response = super().get(request, patient_id)
        memory = next((item for item in response.data if str(item["id"]) == memory_id), None)
        if memory is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(memory)


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
