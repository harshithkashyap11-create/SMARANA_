"""Production secret defaults must fail closed before the app can start."""

import os
import subprocess
import sys

import pytest


@pytest.mark.parametrize("secret", ["", "short", "development-only-change-me-at-least-32-bytes"])
def test_production_refuses_unsafe_signing_secret(secret: str) -> None:
    result = subprocess.run(
        [sys.executable, "-c", "import config.settings.prod"],
        env={**os.environ, "DJANGO_SECRET_KEY": secret},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode != 0
    assert "random DJANGO_SECRET_KEY" in result.stderr
