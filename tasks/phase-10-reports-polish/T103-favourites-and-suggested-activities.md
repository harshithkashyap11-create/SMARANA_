# T103 — Favourites and suggested activities

**Phase:** 10 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T100

## Read first
- `docs/01-scope-and-mvp.md`

## Touches
- `frontend/src/features/patient/games`
- `backend/apps/patients`

## Goal
Patients can favourite games/memories; home suggests one activity based on routine slot and recent engagement.

## Scope (do exactly this)
- `favourites` JSON on profile (patient-editable via sync push allowlist `patient_profile_favourites`?). Simpler: `Favourite(OfflineCapable)` model.
- Suggestion rule (pure, tested): prefer an assigned exercise due today; else favourite not played in 3 days; else calm time in the evening.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [x] Rule tests; UI card.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [x] `/finish-task` run (PROGRESS.md updated, committed)
