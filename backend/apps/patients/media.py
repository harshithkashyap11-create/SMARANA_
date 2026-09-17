"""Helpers for returning short-lived patient media links."""

from typing import Protocol, cast

from django.db.models.fields.files import FieldFile


class ExpiringStorage(Protocol):
    def url(self, name: str, *, expire: int) -> str: ...


def media_url(file: FieldFile | None) -> str | None:
    """Return a ten-minute signed URL when the configured storage supports it."""

    if not file or not file.name:
        return None
    try:
        return str(cast(ExpiringStorage, file.storage).url(file.name, expire=600))
    except TypeError:
        return str(file.storage.url(file.name))
