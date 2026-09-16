# T107 — 'I feel confused / I need a break' mode

**Phase:** 10 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T023b, T104

## Read first
- `docs/01-scope-and-mvp.md`
- `docs/14-design-system.md`

## Touches
- `frontend/src/features/patient/confused`

## Goal
A persistent gentle button that pauses tasks, dims visuals, lowers audio, enables slow speech, shows a comforting photo, and offers Routine / Calm / Call caregiver.

## Scope (do exactly this)
- Global `calmMode` in store; layout applies dim + reduced motion; engine pauses; no alerts sent unless 'Call Priya' chosen.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [x] Vitest: activating pauses engine and enables slow speech; no SOS created.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [x] `/review-task` verdict READY
- [x] `/finish-task` run (PROGRESS.md updated, committed)

## Implementation evidence
Frontend `phase10.test.tsx` verifies paused answers/hints, slow speech, familiar photo, no automatic SOS, and explicit caregiver confirmation. Game renderers unmount while paused to stop audio/preview timers; engine round state is retained.

Verification: backend Ruff, 137 PostgreSQL tests and migration check; frontend lint, typecheck, 189 tests, locale/copy checks and production build. Committed with `feat(care): complete T100-T108 and offline content hardening`.
