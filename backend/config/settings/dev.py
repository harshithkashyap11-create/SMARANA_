"""Local development settings."""

from .base import *  # noqa: F403

DEBUG = True

CSRF_TRUSTED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
