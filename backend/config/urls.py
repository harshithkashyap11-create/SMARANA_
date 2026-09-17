"""Root URL configuration."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView
from rest_framework.permissions import AllowAny

from apps.patients.media_views import LocalMediaView
from config.views import health_check

urlpatterns = [
    path("admin/", admin.site.urls),
    path(
        "api/schema/",
        SpectacularAPIView.as_view(permission_classes=[AllowAny]),
        name="api-schema",
    ),
    path("api/v1/health/", health_check, name="health-check"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.patients.urls")),
    path("api/v1/", include("apps.memories.urls")),
    path("api/v1/", include("apps.alerts.urls")),
    path("api/v1/", include("apps.games.urls")),
    path("api/v1/", include("apps.clinical.urls")),
    path("api/v1/sync/", include("apps.sync.urls")),
    path("api/v1/voice/", include("apps.voice.urls")),
    path("api/v1/", include("apps.content.urls")),
    path("api/v1/", include("apps.reports.urls")),
]


if settings.DEBUG and getattr(settings, "MEDIA_ROOT", None):
    urlpatterns += [path("media/<path:name>", LocalMediaView.as_view(), name="local-media")]
