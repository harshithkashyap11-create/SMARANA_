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
            item["title"] = translated or item["title"]
            grouped.setdefault(str(item["kind"]), []).append(item)
        payload = {"region": region.code, "language": language, "items": grouped}
        version = hashlib.sha256(
            json.dumps(payload, sort_keys=True, default=str).encode()
        ).hexdigest()
        if request.headers.get("If-None-Match") == version:
            return Response(
                status=304, headers={"ETag": version, "Cache-Control": "public, max-age=3600"}
            )
        payload["version"] = version
        return Response(payload, headers={"ETag": version, "Cache-Control": "public, max-age=3600"})
