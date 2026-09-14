"""Helpers for returning short-lived patient media links."""

from django.db.models.fields.files import FieldFile


def media_url(file: FieldFile | None) -> str | None:
    """Return a ten-minute signed URL when the configured storage supports it."""

    if not file or not file.name:
        return None
    try:
        return str(file.storage.url(file.name, expire=600))
    except TypeError:
        return str(file.storage.url(file.name))
