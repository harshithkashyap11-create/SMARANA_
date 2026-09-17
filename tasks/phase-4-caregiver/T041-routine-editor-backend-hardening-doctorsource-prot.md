# T041 — Routine editor backend hardening: doctor-source protection and change history

**Phase:** 4 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T023

## Read first
- `docs/11-permissions-matrix.md (RoutineItem row)`

## Touches
- `backend/apps/routines`

## Goal
Caregivers can CRUD caregiver-sourced items; doctor-sourced items are read-only for caregivers; every change is audited with before/after.

## Scope (do exactly this)
- Permission logic in `services.update_routine_item` (raise `UserFacingError('doctor_item_readonly')`).
- Audit `changes` dict on update; `GET routine-items/{id}/history/` from audit rows (caregiver, doctor).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Conflict detection (T108).

## Acceptance criteria
- [ ] Tests: caregiver edit of doctor item → 403 with code; history endpoint returns audit entries; doctor cannot edit caregiver items.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
