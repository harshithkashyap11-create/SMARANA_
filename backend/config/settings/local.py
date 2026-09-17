"""Host-only demo settings with persistent local media and no external services."""

from .dev import *  # noqa: F403

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
MEDIA_ROOT = BASE_DIR.parent / ".local" / "media"  # noqa: F405
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
# This host-only configuration is the hackathon demo, using fictional data.
DDA_MODEL_ARTIFACT = env(  # noqa: F405
    "DDA_MODEL_ARTIFACT",
    default=str(BASE_DIR / "dda_artifacts" / "dda-synthetic-demo-v1.joblib"),  # noqa: F405
)
DDA_RULE_FALLBACK = env.bool("DDA_RULE_FALLBACK", default=False)  # noqa: F405
