# T020 — PatientProfile full fields, FamilyMember, ConsentSettings + caregiver/doctor edit endpoints

**Phase:** 2 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T012, T016

## Read first
- `docs/03-data-model.md (patients)`
- `docs/04-api-contract.md (Patients)`
- `docs/11-permissions-matrix.md`

## Touches
- `backend/apps/patients`

## Goal
The life-history profile (relatives, places, events, work, songs, hobbies, happy things, soothing prompts, culture), family members with photos, and consent settings — with role-specific serializers.

## Scope (do exactly this)
- Add all `PatientProfile` fields; `FamilyMember` with photo upload (MinIO via django-storages); `ConsentSettings`.
- `PATCH patients/{id}/profile/` with `PatientProfileCaregiverSerializer` (life-history + accessibility) and `PatientProfileDoctorSerializer` (caps, session limit) — chosen by role.
- `patients/{id}/family/` CRUD (caregiver), GET for patient; doctor GET without phone.
- `patients/{id}/consent/` GET/PATCH for patient and primary caregiver.
- Presigned media URLs (10 min) in serializers via a `media_url()` helper.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Frontend.

## Acceptance criteria
- [ ] Tests: caregiver can set `known_places` but not `max_difficulty_level` (field ignored/400); doctor the inverse; doctor family list has no `phone`; non-primary caregiver cannot PATCH consent; audit rows created with `changes`.

## Verification
```
cd backend && ruff check . && pytest -q
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
