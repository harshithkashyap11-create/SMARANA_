# T055 — Clinical notes with visibility + baseline record

**Phase:** 5 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T046, T050

## Read first
- `docs/05-user-stories.md (H4)`
- `docs/11-permissions-matrix.md (ClinicalNote, ClinicalBaseline)`

## Touches
- `backend/apps/clinical`
- `frontend/src/features/doctor/notes`

## Goal
Structured doctor notes (category, status, body, follow-up, visibility, reply-to) and the baseline record; caregivers see `care_team` notes, patients see `patient_visible`.

## Scope (do exactly this)
- Baseline GET/PUT; notes CRUD with visibility filtering in `get_queryset` by role; reply threading to caregiver notes.
- Frontend: notes timeline with filters; baseline form with explicit 'entered by doctor' provenance; no free-text field that could be mistaken for an app-generated diagnosis (label it 'Clinical diagnosis (entered by doctor)').

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: patient sees only patient_visible; caregiver cannot see doctor_only; author-only edit; audit.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
