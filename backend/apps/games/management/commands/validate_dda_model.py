"""Verify the trusted demo export against independent saved cloud cases."""

import hashlib
import importlib
import json
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.games.notebook_dda import FEATURE_COLUMNS, build_features


class Command(BaseCommand):
    help = "Check synthetic DDA checksum, feature parity and RF prediction parity."

    def handle(self, *args: Any, **options: Any) -> None:
        joblib = importlib.import_module("joblib")
        pd = importlib.import_module("pandas")
        sklearn = importlib.import_module("sklearn")

        path = Path(settings.DDA_MODEL_ARTIFACT)
        if not path.is_file():
            raise CommandError("Configure DDA_MODEL_ARTIFACT with the downloaded demo export.")
        report = json.loads((path.parent / "training-report.json").read_text())
        if hashlib.sha256(path.read_bytes()).hexdigest() != report["artifact_sha256"]:
            raise CommandError("Model checksum mismatch.")
        artifact = joblib.load(path)
        if artifact["metadata"]["library_versions"]["sklearn"] != sklearn.__version__:
            raise CommandError("Install matching scikit-learn from requirements-dda.txt.")
        features = json.loads((path.parent / "feature-parity.json").read_text())
        for case in features:
            actual = build_features(
                case["current"], case["history"], case["rt_neutral"], case["condition"]
            )
            for key in FEATURE_COLUMNS:
                expected = case["features"][key]
                if (
                    actual[key] != expected
                    if isinstance(expected, str)
                    else abs(actual[key] - expected) > 1e-9
                ):
                    raise CommandError(f"Feature parity failed: {key}")
        cases = json.loads(path.with_suffix(".parity.json").read_text())
        predictions = artifact["pipeline"].predict(
            pd.DataFrame([c["features"] for c in cases], columns=FEATURE_COLUMNS)
        )
        if list(predictions) != [c["prediction"] for c in cases]:
            raise CommandError("RF reload prediction parity failed.")
        self.stdout.write(
            self.style.SUCCESS(
                f"Synthetic demo verified: {len(features)} feature cases, "
                f"{len(cases)} RF predictions. "
                "Not clinically validated."
            )
        )
