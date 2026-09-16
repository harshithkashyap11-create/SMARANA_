import pytest
from django.core.exceptions import ValidationError

from apps.content.models import ContentItem, Region

pytestmark = pytest.mark.django_db


def test_missing_translation_report_renders_and_has_navigation(client, care_scenario) -> None:
    from apps.content.models import Language

    user = care_scenario["admin"]
    user.is_superuser = True
    user.save()
    client.force_login(user)
    region = Region.objects.create(code="ZX", name="Report test")
    Language.objects.create(code="zz", name="Report language", native_name="Report")
    ContentItem.objects.create(
        region=region, kind="place", title="Missing report title", title_translations={"zz": ""}
    )
    ContentItem.objects.create(
        region=region, kind="place", title="Whitespace translation", title_translations={"zz": "  "}
    )
    response = client.get("/admin/content/contentitem/missing-translations/")
    assert response.status_code == 200
    html = response.content.decode()
    assert "Missing report title" in html
    assert "Whitespace translation" in html
    assert "{%" not in html and "{{" not in html
    listing = client.get("/admin/content/contentitem/")
    assert b"missing-translations/" in listing.content


def test_missing_translation_report_requires_content_permission(client, care_scenario) -> None:
    client.force_login(care_scenario["admin"])
    response = client.get("/admin/content/contentitem/missing-translations/")
    assert response.status_code == 403


def test_admin_publish_rejects_reviewed_content_without_reviewer(client, care_scenario) -> None:
    user = care_scenario["admin"]
    user.is_superuser = True
    user.save()
    client.force_login(user)
    region = Region.objects.create(code="ZV", name="Publish test")
    item = ContentItem.objects.create(
        region=region, kind="place", title="No reviewer", review_status="reviewed"
    )
    response = client.post(
        "/admin/content/contentitem/",
        {"action": "publish", "_selected_action": [str(item.id)]},
        follow=True,
    )
    assert response.status_code == 200
    item.refresh_from_db()
    assert item.review_status == "reviewed"
    assert b"Only reviewed content with a reviewer can be published." in response.content


def test_pack_excludes_unpublished_and_changes_version_when_published(api) -> None:
    region = Region.objects.create(code="ZZ", name="Test region")
    item = ContentItem.objects.create(region=region, kind="place", title="Draft place")
    response = api.get("/api/v1/content/pack/?region=ZZ&lang=en")
    assert response.status_code == 200
    assert response.data["items"] == {}
    initial_version = response.data["version"]
    item.review_status = ContentItem.ReviewStatus.REVIEWED
    item.reviewed_by_id = None
    item.save()
    item.reviewed_by = None
    # A reviewer is required before publication; use a real staff account in admin flows.
    from apps.accounts.models import User

    reviewer = User.objects.create_user(username="reviewer", role=User.Role.ADMIN)
    item.reviewed_by = reviewer
    item.review_status = ContentItem.ReviewStatus.PUBLISHED
    item.full_clean()
    item.save()
    published = api.get("/api/v1/content/pack/?region=ZZ&lang=en")
    assert published.data["items"]["place"][0]["title"] == "Draft place"
    assert published.data["version"] != initial_version


def test_content_item_cannot_publish_without_reviewer() -> None:
    region = Region.objects.create(code="ZY", name="Other test region")
    item = ContentItem(region=region, kind="place", title="Unreviewed", review_status="published")
    with pytest.raises(ValidationError):
        item.full_clean()


def test_import_preserves_curated_content(tmp_path, care_scenario) -> None:
    from django.core.management import call_command

    region = Region.objects.create(code="ZW", name="Importer test")
    item = ContentItem.objects.create(
        region=region,
        kind="place",
        title="Curated place",
        title_translations={"as": "Translation"},
        review_status="published",
        reviewed_by=care_scenario["admin"],
    )
    directory = tmp_path / "ZW"
    directory.mkdir()
    (directory / "manifest.csv").write_text("kind,title\nplace,Curated place\n", encoding="utf-8")
    call_command("import_content", str(directory))
    item.refresh_from_db()
    assert item.review_status == "published"
    assert item.title_translations == {"as": "Translation"}


def test_import_uploads_media_once_and_rejects_unsafe_paths(tmp_path):
    from django.core.management import call_command
    from django.core.management.base import CommandError

    region = Region.objects.create(code="ZU", name="Media import")
    folder = tmp_path / "ZU"
    folder.mkdir()
    (folder / "picture.svg").write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
    (folder / "manifest.csv").write_text(
        "kind,title,image,attribution\nplace,Illustration,picture.svg,Original CC0\n"
    )
    call_command("import_content", str(folder))
    first = ContentItem.objects.get(region=region, title="Illustration")
    original = first.image.name
    assert first.image.storage.exists(original)
    assert first.review_status == "draft"
    call_command("import_content", str(folder))
    first.refresh_from_db()
    assert first.image.name == original
    assert ContentItem.objects.filter(region=region).count() == 1
    (folder / "manifest.csv").write_text(
        "kind,title,image,attribution\nplace,Unsafe,../outside.svg,Original\n"
    )
    with pytest.raises(CommandError):
        call_command("import_content", str(folder))
    assert ContentItem.objects.filter(region=region).count() == 1


def test_original_manifests_have_target_counts_and_media(tmp_path):
    from pathlib import Path

    from django.conf import settings
    from django.core.management import call_command

    targets = {
        "place": 20,
        "festival": 8,
        "dish": 10,
        "tune": 5,
        "sound": 8,
        "activity": 6,
        "word": 40,
        "routine_scene": 4,
    }
    for code in ("AS", "ML"):
        call_command("import_content", str(Path(settings.BASE_DIR) / "content" / code))
        for kind, minimum in targets.items():
            items = ContentItem.objects.filter(region__code=code, kind=kind, tags__demo=True)
            assert items.count() >= minimum
            assert all(item.image and item.tags["attribution"] for item in items)
            if kind in {"tune", "sound"}:
                assert all(item.audio for item in items)
