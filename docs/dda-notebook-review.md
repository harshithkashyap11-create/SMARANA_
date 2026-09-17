# DDA notebook review and deployment contract

Input: `games/Another_copy_of_ML_model1.ipynb`, 52 cells.

The notebook implements supervised Random Forest classification over synthetic
longitudinal sessions, with group-aware user splits/CV, a categorical one-hot
transform and numeric passthrough in its final pipeline. Earlier cells use scaling
and a separate pipeline; those are superseded. It is not an online bandit or RL
engine. A fitted pipeline artifact is required for its RF predictions.

No `.joblib` artifact was supplied. Notebook outputs are not serialized weights.
The application therefore keeps its established deterministic DDA enabled by
default. Supplying a missing/corrupt/incompatible optional artifact conservatively
holds difficulty rather than pretending to run ML. Python runtime dependencies
are optional in `backend/requirements-dda.txt`; the supplied Python 3.14 environment
has no sklearn/pandas/joblib, while the notebook's recorded environment was based
on sklearn 1.6.1/pandas 2.2.3. Use a separate compatible Python 3.12 environment
for the optional workflow; do not replace the working main environment.

## Integration-critical findings

1. `build_features` is redefined in cells 6, 7 and 46. The deployment version omits
   some longitudinal feature construction and differs from training.
2. The missing-history RT median is computed over the whole dataframe before
   train/test splitting. It can depend on future/test observations. The original
   anti-leakage test changes accuracy only and cannot detect this RT leak.
3. Historical `target_adj` is a label, not an observed production action; using it
   as `previous_adjustment` and change-count history leaks information unavailable
   during real gameplay. Production uses persisted actual adjustments.
4. `apply_engagement_safeguards` is called repeatedly but is never defined in any
   code cell. Clean execution cannot validate the advertised complete engine.
5. Cold-start checks conflict: session-index <3 versus combined count <3. Production
   requires three *prior* patient/game sessions before inference.
6. Difficulty is simulated on 0.1–1.0 with 0.05 changes, whereas the real games use
   1–5. Production's explicit mapping is `0.1 + (level-1)*0.225`; predictions still
   map only to -1/0/+1 discrete game adjustments. This requires corrected training
   and calibration; the notebook's existing artifact cannot be assumed equivalent.
7. Condition (`none`, `low_vision`, `motor_tremor`) is not collected by ordinary game
   metrics. Optional inference requires an explicitly recorded
   `patient.accessibility.dda_condition`; missing context holds difficulty.
8. The initial near-perfect performance summary conflicts with later reported
   synthetic macro-F1 0.695. Exported evaluation numbers are hardcoded. Neither is
   evidence of performance on real patients. Labels contain rules, delayed outcomes
   and injected noise; no clinical accuracy or benefit claim is supported.
9. Validation clips out-of-domain data, potentially disguising missing/unsupported
   round data. Production rejects invalid/out-of-domain features and holds.
10. Training, plotting, evaluation, export and demo state are interleaved. The web
    application never executes the notebook or includes its dashboard/training cells.

The original research notebook is preserved. No destructive methodology rewrite or
unvalidated retraining was performed during integration.

## Production feature contract

`backend/apps/games/notebook_dda.py` owns the corrected ordered feature builder.
Time is seconds; frontend reaction time is converted from ms. Difficulty is mapped
as above. Accuracy/history accuracies remain ratios 0–1. Counts are nonnegative
integers. Early-exit and cold-start fields are 0/1. Previous adjustment is -1/0/+1;
change count is 0–5. Trends use previous-three minus previous-three-before-those.
Hint rate is prior hints / prior rounds. Exit rate uses five previous sessions.
Streaks use only immediately preceding accuracy observations. Three-session rolling
features exclude the current session. Historical state is scoped to patient/game.

Missing rolling accuracy is the notebook's explicit 0.65 neutral; missing rolling RT
uses the training-users-only median exported with the artifact. No guessed medical
condition, future label, inaccessible feature or fake patient value is substituted.
The artifact supplies numeric domain bounds; production rejects nonfinite or
out-of-domain rows. No manual scaling is performed outside the serialized pipeline.

`scripts/train-dda.py` is an offline training/export path for a dataset of standard
performance events with patient/game IDs, timestamp, explicit condition,
actual `applied_adjustment` and separate `target_adj` labels. It computes the RT
baseline on training users only, groups history by patient/game and holds out whole
users. It uses the notebook's final preprocessing/RF structure. Export metadata
includes model/version, ordered columns, corrected feature contract, bounds,
library versions, baseline and measured held-out macro-F1. Save/load prediction
parity is asserted and known feature/prediction cases are exported separately.

Example, in the compatible optional environment:

```sh
python scripts/train-dda.py reviewed-events.json /path/to/dda.joblib --version reviewed-v1
# Configure this deployment-controlled file on the Django server:
DDA_MODEL_ARTIFACT=/path/to/dda.joblib

## Synthetic demo model

`notebooks/train_synthetic_dda_colab.ipynb` is a Google Colab-ready workflow. It
generates a reproducible, fictional 23,040-row dataset and trains the same compact
200-tree Random Forest used by the export path. The default size is deliberately
small enough for a free Colab CPU runtime and does not require the developer's RAM.
Replace the repository URL in the first cell before running it. The downloaded
artifact and parity file can then be copied to the Django deployment and enabled
with `DDA_MODEL_ARTIFACT`. Its metadata/provenance is synthetic-demo-policy-v1;
it is only appropriate for a hackathon demonstration, never patient care or
clinical claims.
```

Artifacts must declare `feature_contract=smarana-history-v1`. A legacy notebook
artifact is deliberately rejected because its feature/history contract is not
consistent. Do not simply relabel its metadata to bypass the check.

The optional service loads the full pipeline, performs inference and conservative
safeguards, enforces notebook-inspired cooldown/consistency/frequency limits, and
applies doctor locks, caps and one-level bounds. Decisions record engine/model
versions, raw predictions and final difficulty in session metrics and round events.
There is no cross-patient mutable model state. A request-supplied model path or
uploaded pickle is never loaded. Model exceptions are logged and hold difficulty.

The feature builder and cold-start/missing-model failure path are tested. Actual
notebook/RF prediction parity cannot be verified without a valid trained artifact;
the exporter, model quality, and supervision/calibration still require independent
validation on a suitable reviewed dataset. The app's functioning default DDA is
the existing rule engine, not this unverified RF candidate.
