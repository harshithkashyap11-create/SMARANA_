# T052 — Medications: doctor create/update → routine items + caregiver flag

**Phase:** 5 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T023, T050

## Read first
- `docs/05-user-stories.md (C3)`

## Touches
- `backend/apps/routines`
- `frontend/src/features/doctor/routine`

## Goal
Doctors prescribe/edit medications; routine items are generated per dose time; caregivers are alerted on changes.

## Scope (do exactly this)
- `services.upsert_medication` creates/updates `RoutineItem(category=medicine, source=doctor, source_ref=medication.id)` per time; deactivation ends items; alert `prescription_updated` (info) to caregivers; audit.
- Doctor UI: medications list + form on Routine & Medicines tab; routine read-only view.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: two times → two items; changing times updates items without orphans; caregiver alert created; caregiver cannot POST medications.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
