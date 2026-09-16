"""Import a rights-noted regional content manifest without duplicate rows."""

import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from apps.content.models import ContentItem, Region


class Command(BaseCommand):
    help = "Import content/<STATE>/manifest.csv idempotently."

    def add_arguments(self, parser):  # type: ignore[no-untyped-def]
        parser.add_argument("directory")

    def handle(self, *args, **options):  # type: ignore[no-untyped-def]
        del args
        directory = Path(options["directory"])
        manifest = directory / "manifest.csv"
        if not manifest.is_file():
            raise CommandError(f"No manifest found at {manifest}")
        code = directory.name.upper()
        try:
            region = Region.objects.get(code=code)
        except Region.DoesNotExist as exc:
            raise CommandError(f"Unknown region {code}") from exc
        created = 0
        with manifest.open(newline="", encoding="utf-8") as source:
            for row in csv.DictReader(source):
                if not row.get("kind") or not row.get("title"):
                    raise CommandError("Each manifest row needs kind and title.")
                tags = {
                    "attribution": row.get("attribution", ""),
                    "generic": row.get("generic", "").lower() == "true",
                }
                _, was_created = ContentItem.objects.update_or_create(
                    region=region,
                    kind=row["kind"],
                    title=row["title"],
                    defaults={
                        "title_translations": {"en": row["title"]},
                        "tags": tags,
                        "review_status": ContentItem.ReviewStatus.REVIEWED,
                    },
                )
                created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Imported {created} new item(s) for {code}."))
