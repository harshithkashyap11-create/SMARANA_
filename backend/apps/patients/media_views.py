"""Local media must obey the same ownership/consent rules as its metadata."""

from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework.authentication import SessionAuthentication
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.accounts.authentication import ApprovedJWTAuthentication
from apps.accounts.models import User
from apps.content.models import ContentItem
from apps.memories.models import Memory, MemoryMedia
from apps.patients.models import FamilyMember
from apps.patients.selectors import patients_for
from apps.shared.permissions import authenticated_user


class LocalMediaView(APIView):
    authentication_classes = [ApprovedJWTAuthentication, SessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request: Request, name: str) -> FileResponse:
        user = authenticated_user(request)
        scope = patients_for(user)
        file = None
        if name.startswith("family/"):
            member = get_object_or_404(FamilyMember, photo=name, patient__in=scope)
            file = member.photo
        elif name.startswith("memories/"):
            rows = MemoryMedia.objects.filter(
                file=name, memory__patient__in=scope, memory__deleted_at__isnull=True
            )
            if user.role == User.Role.DOCTOR:
                rows = rows.filter(
                    memory__visibility=Memory.Visibility.CARE_TEAM,
                    memory__patient__consent__share_memories_with_doctor=True,
                )
            media = get_object_or_404(rows)
            if (
                user.role == User.Role.DOCTOR
                and media.kind == "audio"
                and not media.memory.patient.consent.share_audio_with_doctor
            ):
                raise NotFound()
            file = media.file
        elif name.startswith("content/"):
            content_rows = ContentItem.objects.filter(
                review_status=ContentItem.ReviewStatus.PUBLISHED
            )
            item = (
                content_rows.filter(image=name).first() or content_rows.filter(audio=name).first()
            )
            if item:
                file = item.image if item.image.name == name else item.audio
        if not file:
            raise NotFound()
        try:
            response = FileResponse(file.open("rb"))
        except (FileNotFoundError, OSError) as exc:
            raise NotFound() from exc
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
