# T033 — 'Looking for a challenge today?' toggle and level caps in the engine

**Phase:** 3 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T032

## Read first
- `docs/05-user-stories.md (D2)`
- `docs/07-dda-spec.md (rule 2, caps)`

## Touches
- `frontend/src/features/patient/games`
- `frontend/src/games/engine`

## Goal
Games-section-only toggle that runs the next session at level+1 (bounded by max and doctor cap) without changing stored state.

## Scope (do exactly this)
- Toggle on games list (session-scoped, not persisted beyond the day). Engine passes `challengeMode=true` and plays at `min(level+1, cap ?? max)`.
- `GameSession.challenge_mode` sent; DDA treats it per spec.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Vitest: with toggle on, session level = base+1 and stored state unchanged after a 'hold'; at cap it stays at cap.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
