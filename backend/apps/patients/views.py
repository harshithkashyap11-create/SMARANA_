"""Assignment-scoped patient read endpoints."""

from django.db.models.query import QuerySet
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.models import User
from apps.patients.models import PatientProfile
from apps.patients.selectors import patients_for
from apps.patients.serializers import PatientCardSerializer
from apps.shared.permissions import IsRole


class PatientViewSet(ReadOnlyModelViewSet):
    queryset = PatientProfile.objects.none()
    serializer_class = PatientCardSerializer
    permission_classes = [
        IsAuthenticated,
        IsRole(User.Role.CAREGIVER, User.Role.DOCTOR, User.Role.PATIENT),
    ]
    http_method_names = ["get", "head", "options"]

    def get_queryset(self) -> QuerySet[PatientProfile]:
        if getattr(self, "swagger_fake_view", False):
            return self.queryset
        return patients_for(self.request.user)
