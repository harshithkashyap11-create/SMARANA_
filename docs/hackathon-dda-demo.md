# Hackathon DDA demo

The downloaded executed Colab notebook is preserved in
`notebooks/SMARANA_synthetic_DDA_cloud_v1.ipynb`. Its embedded model bundle is
installed in `backend/dda_artifacts/`, with the original checksum, evaluation
report and independent parity cases. This is a synthetic demo model, **not
clinically validated**. Scores measure imitation of a fictional policy.

## Run locally

Use Python 3.12 and a separate environment; the existing Python 3.14 environment
cannot use the model's pinned scikit-learn release.

```sh
python3.12 -m venv backend/.venv-dda
backend/.venv-dda/bin/python -m pip install -r backend/requirements-dda.txt
bash scripts/start-local.sh
```

The local start script validates the export, then warms up games without previous
play for the fictional RAO1234 account. Existing gameplay and doctor restrictions
are preserved. Warm-up sessions carry `dda-demo:` seeds and `synthetic_demo`
markers; running the command again does not duplicate them. Other accounts never
receive inferred accessibility conditions or fictional history.

Open http://localhost:5173 and sign in with RAO1234 / PIN 1234. Open Games and play
Visual Search or Sequence Recall. Difficulty is adjusted during supported rounds
and saved for the next session. A struggling session can decrease one level;
increases require consistent evidence and obey cooldowns. Guest practice holds
difficulty. Levels stay within game bounds and doctor caps; doctor locks prevail.

The first three prior sessions are required before RF inference. Demo warm-up
provides those observations for eligible games. The model remains conservative;
a correct answer does not guarantee an increase.

If a port is occupied or your browser has cached an older demo, use free ports:
`SMARANA_FRONTEND_PORT=5190 SMARANA_BACKEND_PORT=8010 bash scripts/start-local.sh`,
then open http://127.0.0.1:5190. Startup checks port availability and both health
responses before printing the URLs. The latest verification and voice setup are
in [the final audit runbook](pre-release-audit.md).

The synthetic export supports limited response-time, session-length and round
ranges. Demo settings hold the current difficulty when the RF is unavailable,
accessibility context is missing, or features exceed training bounds. An explicit
`DDA_RULE_FALLBACK=true` allows the existing deterministic engine for out-of-domain
features only, labelled `engine_version=deterministic-session-v1` and
`model_status=model_out_of_domain`. Artifact, history and inference errors always
hold. No feature clipping or model retraining occurs.

## Verify and inspect

```sh
cd backend
DJANGO_SETTINGS_MODULE=config.settings.local .venv-dda/bin/python manage.py validate_dda_model
DJANGO_SETTINGS_MODULE=config.settings.local .venv-dda/bin/python manage.py seed_dda_demo
```

The validator checks artifact SHA-256, 20 feature cases against Django's actual
builder, and five saved RF predictions. Round responses expose engine/model
versions; saved sessions include `metrics.dda` with the final difficulty and
actual applied adjustment. Round changes persist without a second session-end
step. API retry IDs prevent duplicate observations.

Local verification on 2026-09-17: 50 Django game tests passed, then all seven model
integration tests passed after adding an out-of-domain fallback test (51 distinct
backend checks in total). Frontend typecheck, production build and 113 integrated
game tests passed. Python lint and shell syntax checks passed.

## Docker demo

```sh
docker compose -f docker-compose.yml -f docker-compose.demo-dda.yml up --build
```

Then run `seed_demo`, `validate_dda_model` and `seed_dda_demo` with
`docker compose -f docker-compose.yml -f docker-compose.demo-dda.yml exec backend python manage.py`.
The override installs ML libraries and explicitly enables the bundled synthetic
model and rule fallback. Production settings do not enable a synthetic model by
default. For an explicitly configured deployment, build with `INSTALL_DDA=true`
and set `DDA_MODEL_ARTIFACT=/app/dda_artifacts/dda-synthetic-demo-v1.joblib`.

Clinical validation remains outside this integration: no clinical study or real
patient outcome evaluation has been performed. Present this as an adaptive game
demo, not a diagnostic or treatment system.
