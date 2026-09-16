import pytest
from django.core.management.base import CommandError

from apps.content.contracts import validate_tags


def test_scene_variants_contract():
    validate_tags(
        "routine_scene",
        {
            "variants": [
                {
                    "imageUrl": "/changed.svg",
                    "differences": [{"id": "bird", "title": "Bird", "imageUrl": ""}],
                }
            ]
        },
    )


@pytest.mark.parametrize(
    "tags",
    [
        {"variants": []},
        {"variants": [{"imageUrl": "/x", "differences": []}]},
        {"variants": [{"imageUrl": "/x", "differences": [{"id": "x"}]}]},
    ],
)
def test_invalid_variants_are_rejected(tags):
    with pytest.raises(CommandError):
        validate_tags("routine_scene", tags)
