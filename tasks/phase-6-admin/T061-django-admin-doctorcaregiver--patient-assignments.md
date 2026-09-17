# T061 — Django Admin: doctor/caregiver ↔ patient assignments with reason and history; instant access revocation

**Phase:** 6 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T012, T060

## Read first
- `docs/05-user-stories.md (I2)`

## Touches
- `backend/apps/patients/admin.py`

## Goal
Assignments managed in admin (create, end with reason), visible history per patient, and revoked assignments immediately scope out.

## Scope (do exactly this)
- `PatientProfileAdmin` with inlines for `CareAssignment` and `DoctorAssignment` (active + ended shown), `assigned_by` auto-set, `reason` required on end.
- Admin action 'Transfer doctor' (ends current, creates new).
- Audit `assign`/`unassign`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: ending an assignment → doctor's next API call for that patient is 404; history retains ended rows.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
