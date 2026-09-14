"""Automated test settings using PostgreSQL."""

from .base import *  # noqa: F403

DEBUG = False
CELERY_TASK_ALWAYS_EAGER = True
SECRET_KEY = "test-only-secret-key-that-is-long-enough-for-hs256"
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
    "django.contrib.auth.hashers.Argon2PasswordHasher",
]
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.InMemoryStorage"},
    "staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
}
