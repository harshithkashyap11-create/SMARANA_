# T006 — Test scaffolding: factories, care_scenario fixture, seed command

**Phase:** 0 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T002

## Read first
- `docs/12-testing-and-dod.md`
- `docs/03-data-model.md (accounts, patients)`

## Touches
- `backend/apps/shared/tests`
- `backend/conftest.py`
- `backend/apps/accounts/management`

## Goal
Reusable fixtures every later task depends on, plus a `seed_demo` command with Rao/Priya/Dr. Deka/admin.

## Scope (do exactly this)
- `UserFactory(role=...)`, `PatientFactory` (user+PatientProfile+PatientCredential with PIN 1234), `CaregiverFactory`, `DoctorFactory`. NOTE: `PatientProfile`, `PatientCredential`, `CareAssignment`, `DoctorAssignment` models are created here in `apps/patients` and `apps/accounts` with only the fields needed for scoping (full fields arrive in T020/T011).
- `care_scenario` fixture returning patient, caregiver, doctor, other_patient, other_caregiver, other_doctor, admin with assignments wired.
- `frozen_now` fixture (freezegun).
- `python manage.py seed_demo` creates the four demo users idempotently (login ids RAO1234 / PIN 1234; priya@example.com; deka@example.com; admin) and prints them.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Endpoints.

## Acceptance criteria
- [ ] `pytest` runs a test using `care_scenario` that asserts the caregiver is assigned to `patient` and not `other_patient`.
- [ ] `seed_demo` run twice creates no duplicates.

## Verification
```
cd backend && ruff check . && pytest -q
cd backend && python manage.py seed_demo && python manage.py seed_demo
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
