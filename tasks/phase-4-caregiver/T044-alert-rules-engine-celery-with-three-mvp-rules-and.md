# T044 — Alert rules engine (Celery) with three MVP rules and explanations

**Phase:** 4 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T011, T023, T030

## Read first
- `docs/03-data-model.md (alerts)`
- `docs/05-user-stories.md (G2)`

## Touches
- `backend/apps/alerts/rules.py`
- `backend/apps/alerts/tasks.py`

## Goal
Nightly evaluation producing alerts with exact event, timestamp, reasoning, and evidence; no single-round triggers.

## Scope (do exactly this)
- Rules as pure functions `evaluate(patient, now) -> AlertDraft | None`: `no_login_2d` (DeviceSession.last_seen_at > 48h), `missed_meds_3in7` (≥3 medicine reminders `missed`/`skipped` in 7 days), `level_drop_x3` (≥3 `demote` changes in 14 days across games). Severity: attention; `sos`/`pin_lockout` stay high.
- Dedupe: one open alert per rule per patient; re-evaluation updates evidence instead of duplicating.
- Celery Beat 02:00 IST; `GET alerts/?patient=&status=` scoped; `acknowledge`, `forward` (to assigned doctor; sets `forwarded_to`), `dismiss` (doctor).
- Explanation strings templated, e.g. 'Missed 3 of 14 medicine reminders between 5 Sep and 11 Sep (evening dose most often).'

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Remaining rules (T075, T109).
- Delivery channels (T045).

## Acceptance criteria
- [ ] Rule unit tests with freezegun for trigger/non-trigger boundaries; dedupe test; permission tests; a single demote does not trigger.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
