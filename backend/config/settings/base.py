"""Settings shared by every Smārana environment."""

from datetime import timedelta
from pathlib import Path

import django_stubs_ext
import environ  # type: ignore[import-untyped]  # django-environ exposes no PEP 561 types.
from celery.schedules import crontab

django_stubs_ext.monkeypatch()

BASE_DIR = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BASE_DIR.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_SECRET_KEY=(str, "development-only-change-me-at-least-32-bytes"),
)
environ.Env.read_env(PROJECT_ROOT / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env.bool("DJANGO_DEBUG")
REQUIRE_ADMIN_OTP = True
ALLOWED_HOSTS = env.list(
    "DJANGO_ALLOWED_HOSTS",
    default=["localhost", "127.0.0.1", "backend", "testserver"],
)

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_otp",
    "django_otp.plugins.otp_totp",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",
    "django_filters",
    "storages",
    "apps.shared.apps.SharedConfig",
    "apps.admin_portal.apps.AdminPortalConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.audit.apps.AuditConfig",
    "apps.patients.apps.PatientsConfig",
    "apps.routines.apps.RoutinesConfig",
    "apps.alerts.apps.AlertsConfig",
    "apps.memories.apps.MemoriesConfig",
    "apps.games.apps.GamesConfig",
    "apps.clinical.apps.ClinicalConfig",
    "apps.sync.apps.SyncConfig",
    "apps.voice.apps.VoiceConfig",
    "apps.content.apps.ContentConfig",
    "apps.reports.apps.ReportsConfig",
]
VOICE_ROUTER_ENDPOINT = env("VOICE_ROUTER_ENDPOINT", default="")
VOICE_ROUTER_TOKEN = env("VOICE_ROUTER_TOKEN", default="")
VOICE_LLM_FALLBACK = env.bool("VOICE_LLM_FALLBACK", default=False)
LOCAL_LLM_PROVIDER = env("LOCAL_LLM_PROVIDER", default="")
LOCAL_LLM_MODEL = env("LOCAL_LLM_MODEL", default="qwen2.5:1.5b")
LOCAL_LLM_URL = env("LOCAL_LLM_URL", default="http://127.0.0.1:11434")
LOCAL_LLM_TIMEOUT = env.int("LOCAL_LLM_TIMEOUT", default=8)

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.shared.middleware.PrivateApiCacheMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
                "apps.admin_portal.context.admin_counts",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="smarana"),
        "USER": env("POSTGRES_USER", default="smarana"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="smarana_dev"),
        "HOST": env("POSTGRES_HOST", default="db"),
        "PORT": env.int("POSTGRES_PORT", default=5432),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
        "OPTIONS": {"min_length": 12},
    },
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
STORAGES = {
    "default": {"BACKEND": "storages.backends.s3.S3Storage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
AWS_ACCESS_KEY_ID = env("MINIO_ROOT_USER", default="smarana")
AWS_SECRET_ACCESS_KEY = env("MINIO_ROOT_PASSWORD", default="smarana_dev_password")
AWS_STORAGE_BUCKET_NAME = env("MINIO_BUCKET", default="smarana-media")
AWS_S3_ENDPOINT_URL = env("MINIO_ENDPOINT", default="http://minio:9000")
AWS_S3_REGION_NAME = env("MINIO_REGION", default="us-east-1")
AWS_QUERYSTRING_AUTH = True
AWS_QUERYSTRING_EXPIRE = 600
AWS_DEFAULT_ACL = None
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REST_FRAMEWORK: dict[str, object] = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.accounts.authentication.ApprovedJWTAuthentication",
    ],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "apps.shared.pagination.StandardPagination",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.shared.exceptions.user_facing_exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "UPDATE_LAST_LOGIN": False,
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Smārana API",
    "VERSION": "1.0.0",
    "SERVERS": [{"url": "/", "description": "Current host"}],
}

CELERY_BROKER_URL = env("REDIS_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = CELERY_BROKER_URL
CELERY_TIMEZONE = "Asia/Kolkata"
CELERY_BEAT_SCHEDULE = {
    "retry-alert-notifications": {
        "task": "apps.alerts.tasks.retry_alert_notifications",
        "schedule": 60.0,
    },
    "materialise-reminders-daily": {
        "task": "apps.routines.tasks.materialise_all_reminders",
        "schedule": crontab(hour=0, minute=5),
    },
    "mark-missed-reminders": {
        "task": "apps.routines.tasks.mark_missed_reminders",
        "schedule": 900.0,
    },
    "evaluate-alert-rules-nightly": {
        "task": "apps.alerts.tasks.evaluate_alert_rules",
        "schedule": crontab(hour=2, minute=0),
    },
}

# The website embeds staff administration on the same origin.
X_FRAME_OPTIONS = "SAMEORIGIN"
