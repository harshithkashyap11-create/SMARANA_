# T054 — Exercise assignments → patient routine, completion tracking, reviews due

**Phase:** 5 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T052, T053

## Read first
- `docs/05-user-stories.md (H3)`

## Touches
- `backend/apps/clinical`
- `frontend/src/features/doctor/assignments`

## Goal
Doctors assign games (level, minutes, times/week, slot, review date) that appear in the patient routine; completion is tracked from sessions.

## Scope (do exactly this)
- `ExerciseAssignment` → creates `RoutineItem(category=game, source=doctor, source_ref=assignment.id)` on chosen days/slot; sets `DifficultyState.level=start_level` if no sessions yet.
- `GET assignments/` includes `completion` {planned_this_week, done_this_week} from sessions of that game; dashboard `reviews_due` populated.
- Frontend: assignment form and list with completion chips.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: assignment creates items; completing a session counts; review date in past appears in dashboard.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
