"""Production settings with fail-closed secret configuration."""

import environ

from .base import *  # noqa: F403

prod_env = environ.Env()

DEBUG = False
SECRET_KEY = prod_env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = prod_env.list("DJANGO_ALLOWED_HOSTS")
