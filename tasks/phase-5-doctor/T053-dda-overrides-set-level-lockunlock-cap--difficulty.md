# T053 — DDA overrides: set level, lock/unlock, cap + difficulty history UI

**Phase:** 5 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T031, T050

## Read first
- `docs/07-dda-spec.md (Doctor overrides)`
- `docs/05-user-stories.md (D5)`

## Touches
- `backend/apps/clinical`
- `frontend/src/features/doctor/difficulty`

## Goal
Doctors view per-game difficulty history with explanations and can override, lock, or cap with a reason; everything audited.

## Scope (do exactly this)
- Backend `POST difficulty/{game_key}/override/`; `DdaOverride` + `DifficultyChange` + audit; `max_difficulty_level` on profile acts as a global cap in `save_session`.
- Frontend: per-game panel with level timeline, change list with explanation + link to triggering session, override form (reason required).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: lock → subsequent poor sessions hold with `doctor_lock`; cap below current level → level lowered with `cap`; caregiver override → 403.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
