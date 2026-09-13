# T022 — My Progress summary (encouraging, no clinical numbers)

**Phase:** 2 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T021

## Read first
- `docs/05-user-stories.md (F3)`
- `docs/04-api-contract.md (progress-summary)`

## Touches
- `backend/apps/patients`
- `frontend/src/features/patient/progress`

## Goal
A progress page that shows completed tasks today, points, streak days, favourite games, and what's next — nothing else.

## Scope (do exactly this)
- Backend `GET patients/{id}/progress-summary/` (stubs games until Phase 3: favourite_games empty).
- Frontend page with large friendly cards; copy from i18n; a streak shown as suns/stars, not a number, unless `showPoints`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Charts.
- Accuracy or reaction time anywhere.

## Acceptance criteria
- [ ] Test asserts the response has no keys named accuracy/level/reaction; component test asserts no `%` rendered.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
