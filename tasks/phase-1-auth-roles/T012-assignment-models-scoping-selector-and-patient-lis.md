# T012 — Assignment models, scoping selector, and patient list/detail endpoints

**Phase:** 1 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T010

## Read first
- `docs/11-permissions-matrix.md`
- `docs/04-api-contract.md (Patients)`

## Touches
- `backend/apps/patients`

## Goal
`patients_for(user)` selector and `GET patients/`, `GET patients/{id}/` correctly scoped for caregiver, doctor, and patient-self.

## Scope (do exactly this)
- Finish `CareAssignment` and `DoctorAssignment` fields (`is_primary`, `active`, `assigned_by`, `assigned_at`, `ended_at`, `reason`).
- `selectors.patients_for(user)` per the django-backend skill; `PatientCardSerializer` (name, age, language, primary caregiver name, last_active_at, open_alert_count).
- `PatientViewSet` (list, retrieve) with `IsRole('caregiver','doctor','patient')`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Profile editing (T020).

## Acceptance criteria
- [ ] Permission tests: caregiver sees only assigned; doctor sees only assigned; patient sees only self; other patient's detail → 404; inactive assignment → excluded; admin via API → 403 (uses Django Admin).

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
