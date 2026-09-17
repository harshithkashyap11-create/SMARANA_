"""Import attributed manifests and local media without replacing curated work."""

import csv
import json
from pathlib import Path

from django.core.files import File
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction

from apps.content.models import ContentItem, Region


class Command(BaseCommand):
    help = "Import content/<STATE>/manifest.csv and its image/audio files idempotently."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("directory")

    def handle(self, *args: object, **options: object) -> None:
        directory = Path(str(options["directory"])).resolve()
        manifest = directory / "manifest.csv"
        if not manifest.is_file():
            raise CommandError(f"No manifest found at {manifest}")
        try:
            region = Region.objects.get(code=directory.name.upper())
        except Region.DoesNotExist as exc:
            raise CommandError(f"Unknown region {directory.name}") from exc

        def local_file(name: str | None) -> Path | None:
            if not name:
                return None
            file = (directory / name).resolve()
            if not file.is_relative_to(directory) or not file.is_file():
                raise CommandError(f"Missing or unsafe media path: {name}")
            return file

        # Validate every row/file before creating records or uploading media.
        with manifest.open(newline="", encoding="utf-8") as source:
            rows = list(csv.DictReader(source))
        prepared = []
        for row in rows:
            if row.get("kind") not in ContentItem.Kind.values or not row.get("title", "").strip():
                raise CommandError("Each row needs a valid kind and non-empty title.")
            try:
                translations = json.loads(row.get("title_translations") or "{}")
                tags = json.loads(row.get("tags") or "{}")
            except json.JSONDecodeError as exc:
                raise CommandError("Translations and tags must contain valid JSON.") from exc
            if not isinstance(translations, dict) or not isinstance(tags, dict):
                raise CommandError("Translations and tags must be JSON objects.")
            if any(not isinstance(x, str) for x in translations.values()):
                raise CommandError("Translation values must be strings.")
            from apps.content.contracts import validate_tags

            validate_tags(row["kind"], tags)
            tags.update(
                {
                    "attribution": row.get("attribution", ""),
                    "generic": row.get("generic", "").lower() == "true",
                }
            )
            if (row.get("image") or row.get("audio")) and not tags["attribution"]:
                raise CommandError("Media needs attribution.")
            prepared.append(
                (
                    row,
                    translations,
                    tags,
                    local_file(row.get("image")),
                    local_file(row.get("audio")),
                )
            )
        created = 0
        with transaction.atomic():
            for row, translations, tags, image, audio in prepared:
                item, was_created = ContentItem.objects.get_or_create(
                    region=region,
                    kind=row["kind"],
                    title=row["title"],
                    defaults={
                        "title_translations": {"en": row["title"], **translations},
                        "tags": tags,
                        "review_status": ContentItem.ReviewStatus.DRAFT,
                    },
                )
                # Extend legacy demo scenes without overwriting curated metadata.
                additions = {key: value for key, value in tags.items() if key not in item.tags}
                if additions:
                    item.tags = {**item.tags, **additions}
                    item.save(update_fields=["tags", "updated_at"])
                    if item.tags.get("demo") and "variants" in additions and image:
                        # Only generated practice scenes may adopt the matching base.
                        with image.open("rb") as stream:
                            item.image.save(image.name, File(stream), save=False)
                        item.save(update_fields=["image", "updated_at"])
                # Only fill empty media; never replace a curator's chosen asset.
                for field, file in (("image", image), ("audio", audio)):
                    if file and not getattr(item, field):
                        with file.open("rb") as stream:
                            getattr(item, field).save(file.name, File(stream), save=False)
                        item.save(update_fields=[field, "updated_at"])
                created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Imported {created} new item(s) for {region.code}."))
