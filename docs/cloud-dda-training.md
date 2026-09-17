# Synthetic DDA cloud training

Trained on Google Colab CPU on 2026-09-17. The saved notebook is
[SMARANA_synthetic_DDA_cloud_v1.ipynb](https://colab.research.google.com/drive/1a8yTP0Zq_PQZRaFV7WVJnCFnLoCd37Fe).
Its final output contains **Download trained SMARANA demo model bundle**.
The ZIP is embedded in saved notebook output, so the export does not depend on
the original runtime remaining alive. Notebook access permissions were preserved.

## Measured results

| Item | Result |
|---|---|
| Model | Random Forest, 200 trees, balanced subsampling, seed 42 |
| Dataset | 23,040 synthetic sessions; 120 simulated users; 12 games |
| Split | 96 training users / 24 held-out users; no user overlap |
| Held-out macro F1 | 0.9450115838365466 |
| Held-out accuracy | 0.9958767361111112 |
| Decrease / hold / increase F1 | 1.0000 / 0.9974 / 0.8376 |
| Reload prediction parity | Passed |
| Feature parity | 23,040 rows checked against backend semantics |
| Independent local feature check | Actual Django builder matched all 19 fields of a cloud case |

Training labels imitate a transparent synthetic policy. The increase class has
only 60 held-out examples. These scores are not evidence of clinical efficacy or
real-patient generalization. No real patient records were used.

## Export and reproducibility

The bundle contains `dda-synthetic-demo-v1.joblib`, the classification report,
confusion matrix, library metadata, five reload-prediction cases and twenty
feature-parity cases. Artifact SHA-256:
`b187dc99a212ebebd7ff92456d7455fbc8ea92d8c0f8ad0cb810ab8651c10d5f`.

Libraries: scikit-learn 1.6.1, pandas 2.2.3, NumPy 2.1.3, joblib 1.4.2.
Colab used Python 3.13.15. The feature contract is `smarana-history-v1`.
Response times use seconds; history is scoped per user/game and excludes the
current action/label. The neutral response-time median is fitted on training
users only. Simulated applied actions now record actual bounded level changes,
including zero changes at levels 1 and 5.

The executed notebook preserves the cloud code and results. A portable notebook,
`notebooks/train_synthetic_dda_cloud.ipynb`, embeds the local feature builder and
training scripts for another Colab run without GitLab credentials. GitLab `v2`
was verified at commit `5d6dff35bbff0a4792e15137b620b07e04bdb62d`.
The run includes the applied-action correction described above.

## Demo deployment

Update: the downloaded notebook bundle has now been extracted into
`backend/dda_artifacts/` and enabled by host-only demo settings. See
[hackathon DDA demo](hackathon-dda-demo.md) for startup, verification, explicit
Docker configuration and fallback behavior. The paragraph below describes the
state at the end of the original cloud training run.

Training does not enable the model on the Django server. Download/extract the
bundle, install matching ML libraries in a supported Python environment, and set
`DDA_MODEL_ARTIFACT` to the artifact's absolute path for a demo deployment.
The existing confidence, cooldown, per-patient/game state, doctor caps and bounded
level wrappers still apply. Default deterministic adaptation remains available.
No clinical deployment or live Django server inference was performed in this run;
cloud inference checks reproduced the backend runtime logic.
