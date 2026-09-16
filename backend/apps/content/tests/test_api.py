import pytest
from django.core.exceptions import ValidationError

from apps.content.models import ContentItem, Region

pytestmark = pytest.mark.django_db


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
