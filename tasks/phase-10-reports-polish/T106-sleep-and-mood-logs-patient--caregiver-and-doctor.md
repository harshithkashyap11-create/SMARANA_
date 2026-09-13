# T106 — Sleep and mood logs (patient + caregiver) and doctor visibility by consent

**Phase:** 10 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T070, T046

## Read first
- `docs/03-data-model.md (SleepLog, MoodLog)`

## Touches
- `backend/apps/routines`
- `frontend/src/features/patient/sleep`
- `frontend/src/features/caregiver`

## Goal
Simple bedtime/wake and 5-face mood entry for patients (offline), caregiver entry/correction with audit, doctor read when consent allows.

## Scope (do exactly this)
- Models + endpoints + sync allowlist; patient UI with big face buttons and two time pickers; caregiver correction keeps original in audit.
- Alert rule `low_mood_3d`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: consent off → doctor 404 on mood; correction audited with before/after; rule test.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
