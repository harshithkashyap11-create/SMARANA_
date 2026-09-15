"""Root URL configuration."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from django_otp.admin import OTPAdminSite
from drf_spectacular.views import SpectacularAPIView
from rest_framework.permissions import AllowAny

from config.views import health_check

otp_admin_site = OTPAdminSite(name="otp_admin")
otp_admin_site._registry = admin.site._registry
otp_admin_site.site_header = "Smārana administration"

urlpatterns = [
    path("admin/", otp_admin_site.urls if settings.REQUIRE_ADMIN_OTP else admin.site.urls),
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
]
