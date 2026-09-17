"""Scene variants contain an image URL and one to four named differences."""

from django.core.management.base import CommandError


def validate_tags(kind: str, tags: dict[str, object]) -> None:
    if "variants" not in tags:
        return
    variants = tags["variants"]
    if kind != "routine_scene" or not isinstance(variants, list) or not variants:
        raise CommandError("Scene variants must be a non-empty list.")
    for variant in variants:
        if (
            not isinstance(variant, dict)
            or not isinstance(variant.get("imageUrl"), str)
            or not variant["imageUrl"]
        ):
            raise CommandError("Each variant needs an imageUrl.")
        differences = variant.get("differences")
        if not isinstance(differences, list) or not 1 <= len(differences) <= 4:
            raise CommandError("Each variant needs one to four differences.")
        if any(
            not isinstance(item, dict)
            or any(not isinstance(item.get(key), str) for key in ("id", "title", "imageUrl"))
            for item in differences
        ):
            raise CommandError("Differences need id, title and imageUrl strings.")
        if len({item["id"] for item in differences}) != len(differences):
            raise CommandError("Difference IDs must be unique.")
