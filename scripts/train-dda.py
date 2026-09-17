#!/usr/bin/env python3
"""Offline training/export using the notebook's final RF pipeline and corrected history.

Input JSON rows: patient_id, game_id, timestamp, performance (standard event),
condition, applied_adjustment (real prior action), target_adj (observed label).
No notebook execution and no generated/fabricated patient features.
Run using the optional Python 3.12 DDA environment, from the repository root.
"""

import argparse
import json
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from apps.games.notebook_dda import FEATURE_COLUMNS, FEATURE_CONTRACT, build_features


def main():
    import joblib
    import numpy as np
    import pandas as pd
    import sklearn
    from sklearn.compose import ColumnTransformer
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.metrics import f1_score
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder

    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--version", required=True)
    args = parser.parse_args()
    rows = json.loads(args.dataset.read_text())
    groups = [row["patient_id"] for row in rows]
    train, test = next(
        GroupShuffleSplit(test_size=0.2, random_state=42).split(rows, groups=groups)
    )
    # Fit the missing-history baseline on training users only, before feature construction.
    neutral = statistics.median(
        rows[index]["performance"]["reaction_time_ms"] / 1000 for index in train
    )
    histories = {}
    features = [None] * len(rows)
    for index in sorted(range(len(rows)), key=lambda i: rows[i]["timestamp"]):
        row = rows[index]
        if row["target_adj"] not in [-1, 0, 1] or row["applied_adjustment"] not in [
            -1,
            0,
            1,
        ]:
            raise ValueError("Labels/actions must be -1, 0, +1")
        current = row["performance"]
        history = histories.setdefault((row["patient_id"], row["game_id"]), [])
        features[index] = build_features(current, history, neutral, row["condition"])
        history.append(
            {
                "accuracy": current["accuracy"],
                "response_time": current["reaction_time_ms"] / 1000,
                "hints_used": current["hints_used"],
                "rounds": current["rounds_completed"],
                "early_exit": current["early_exit"],
                "adjustment": row["applied_adjustment"],
            }
        )
    frame = pd.DataFrame(features, columns=FEATURE_COLUMNS)
    labels = np.array([row["target_adj"] for row in rows])
    if set(labels[train]) != {-1, 0, 1}:
        raise ValueError("Training users must contain all three classes")
    pipeline = Pipeline(
        [
            (
                "prep",
                ColumnTransformer(
                    [
                        (
                            "cat",
                            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                            ["condition"],
                        ),
                        ("num", "passthrough", FEATURE_COLUMNS[:-1]),
                    ],
                    verbose_feature_names_out=False,
                ),
            ),
            (
                "clf",
                RandomForestClassifier(
                    n_estimators=200,
                    random_state=42,
                    class_weight="balanced_subsample",
                    n_jobs=-1,
                ),
            ),
        ]
    )
    pipeline.fit(frame.iloc[train], labels[train])
    prediction = pipeline.predict(frame.iloc[test])
    # Bounds are learned only on training users; accuracy/difficulty remain exact contracts.
    schema = {
        key: {
            "min": min(0, float(frame.iloc[train][key].min())),
            "max": max(1, float(frame.iloc[train][key].max()) * 1.1),
        }
        for key in FEATURE_COLUMNS[:-1]
    }
    schema["accuracy"] = {"min": 0, "max": 1}
    schema["current_difficulty"] = {"min": 0.1, "max": 1}
    metadata = {
        "model_version": args.version,
        "feature_contract": FEATURE_CONTRACT,
        "feature_columns": FEATURE_COLUMNS,
        "feature_schema": schema,
        "rt_neutral": neutral,
        "library_versions": {
            "sklearn": sklearn.__version__,
            "pandas": pd.__version__,
            "numpy": np.__version__,
        },
        "metrics": {
            "held_out_user_macro_f1": f1_score(
                labels[test], prediction, average="macro"
            )
        },
        "limitations": "Engagement prototype; dataset provenance and supervision require review.",
    }
    joblib.dump({"pipeline": pipeline, "metadata": metadata}, args.output, compress=3)
    cases = frame.iloc[test[:5]]
    reloaded = joblib.load(args.output)["pipeline"]
    assert np.array_equal(pipeline.predict(cases), reloaded.predict(cases))
    args.output.with_suffix(".parity.json").write_text(
        json.dumps(
            [
                {"features": features, "prediction": int(pred)}
                for features, pred in zip(
                    cases.to_dict("records"), reloaded.predict(cases), strict=True
                )
            ],
            indent=2,
        )
    )
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
