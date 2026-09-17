from django.apps import AppConfig
from django.contrib.admin.apps import AdminConfig


class SmaranaAdminConfig(AdminConfig):
    default_site = "apps.admin_portal.site.SmaranaAdminSite"

    def ready(self) -> None:
        super().ready()
        from django.contrib import admin
        from django_otp.plugins.otp_totp.models import TOTPDevice

        # Preserve existing devices and migrations, but remove Admin OTP management.
        if admin.site.is_registered(TOTPDevice):
            admin.site.unregister(TOTPDevice)


class AdminPortalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.admin_portal"
