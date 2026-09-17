# T046 — Caregiver notes and Progress tab with session table and simple trend charts

**Phase:** 4 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T040, T031

## Read first
- `docs/05-user-stories.md (G4)`
- `docs/04-api-contract.md (game-sessions, difficulty-changes)`

## Touches
- `backend/apps/clinical (CaregiverNote → reuse ClinicalNote with author role)`
- `frontend/src/features/caregiver/progress`

## Goal
Progress tab: sessions list, accuracy/RT trend lines (Recharts), difficulty change log with explanations; a Notes panel for non-clinical caregiver notes.

## Scope (do exactly this)
- Backend: `GET game-sessions/`, `GET difficulty-changes/` scoped; notes: reuse `ClinicalNote` model created here with `author` and `category`; caregivers may create notes with `category=caregiver_feedback` only; visibility `care_team`.
- Frontend: table + two line charts (7/30 day) with a small legend; difficulty log list; notes create/list.
- Disclaimer banner on the tab (design system).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Doctor-specific metrics summary (T051).

## Acceptance criteria
- [ ] Tests: caregiver note with another category → 400; charts render with fake data; empty state copy.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
