import json
from pathlib import Path

import pytest

from apps.games.dda import DdaConfig, DifficultyStateData, SessionSummary, next_difficulty

CASES = json.loads((Path(__file__).parents[4] / "shared" / "dda_cases.json").read_text())


@pytest.mark.parametrize("case", CASES, ids=lambda case: case["name"])
def test_shared_vector(case: dict) -> None:
    result = next_difficulty(
        DifficultyStateData(**case["state"]),
        SessionSummary(**case["session"]),
        DdaConfig(**case["config"]),
    )
    assert result.state.level == case["expected"]["level"]
    assert result.change.reasonCode == case["expected"]["reasonCode"]
    assert result.messageKey == case["expected"]["messageKey"]
    assert len(result.state.window) == case["expected"]["windowLength"]
    if explanation := case["expected"].get("explanation"):
        assert result.change.explanation == explanation
