# T036 — Resume-where-you-left-off for games and quiz

**Phase:** 3 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T030, T027

## Read first
- `docs/05-user-stories.md (B3)`

## Touches
- `frontend/src/games/engine/resume.ts`
- `frontend/src/features/patient/home`

## Goal
Reopening the app after an interrupted game offers Continue / Start over and restores the exact round.

## Scope (do exactly this)
- `resumeState` {module, seed, level, roundIndex, metricsSoFar, startedAt} written after each round; cleared on end.
- Home shows a `Card` 'Continue your game?' when present; Start over discards and records an abandoned session (`abandoned_reason='user_exit'`).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Vitest: unmount mid-session → remount shows resume card → continue restores round index and seed.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
