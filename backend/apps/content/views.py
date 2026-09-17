import hashlib
import json

from django.db.models import QuerySet
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.content.models import ContentItem, Region
from apps.content.serializers import ContentItemSerializer


class ContentPackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        region_code = request.query_params.get("region", "").upper()
        language = request.query_params.get("lang", "en")
        if language not in {"en", "as", "bn"}:
            return Response({"code": "language_unavailable"}, status=404)
        try:
            region = Region.objects.get(code=region_code, enabled=True)
        except Region.DoesNotExist:
            return Response({"detail": "Unknown enabled region."}, status=404)
        items: QuerySet[ContentItem] = ContentItem.objects.filter(
            region=region, review_status=ContentItem.ReviewStatus.PUBLISHED
        ).select_related("region")
        grouped: dict[str, list[dict[str, object]]] = {}
        for item in ContentItemSerializer(items, many=True).data:
            translated = (
                item["title_translations"].get(language)
                if isinstance(item["title_translations"], dict)
                else None
            )
            if language != "en" and (not isinstance(translated, str) or not translated.strip()):
                return Response(
                    {
                        "code": "translation_unavailable",
                        "region": region.code,
                        "language": language,
                    },
                    status=404,
                )
            # Titles alone do not translate game answers, activities, scene targets or instructions.
            if language != "en":
                translations = item["tags"].get("translations", {})
                localized_tags = (
                    translations.get(language) if isinstance(translations, dict) else None
                )
                if not isinstance(localized_tags, dict):
                    return Response(
                        {
                            "code": "translation_unavailable",
                            "region": region.code,
                            "language": language,
                        },
                        status=404,
                    )
                item["tags"] = localized_tags
            item["title"] = translated if language != "en" else item["title"]
            grouped.setdefault(str(item["kind"]), []).append(item)
        payload = {
            "region": region.code,
            "language": language,
            "items": grouped,
            "content_status": "demo"
            if any(
                isinstance(tags := item.get("tags"), dict) and tags.get("demo")
                for group in grouped.values()
                for item in group
            )
            else "regional",
            "native_review": "not-recorded",
            "clinical_review": "not-recorded",
        }
        version = hashlib.sha256(
            json.dumps(payload, sort_keys=True, default=str).encode()
        ).hexdigest()
        if request.headers.get("If-None-Match") == version:
            return Response(
                status=304, headers={"ETag": version, "Cache-Control": "public, max-age=3600"}
            )
        payload["version"] = version
        return Response(payload, headers={"ETag": version, "Cache-Control": "public, max-age=3600"})
