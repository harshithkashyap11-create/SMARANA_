# T032 — DDA TypeScript port + client-side end-of-session flow + supportive messages

**Phase:** 3 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T031

## Read first
- `docs/07-dda-spec.md`

## Touches
- `frontend/src/games/dda.ts`
- `frontend/src/games/engine`

## Goal
Identical DDA in TS validated by the same vectors; engine applies it locally and displays the supportive message; server result reconciles.

## Scope (do exactly this)
- `dda.ts` mirroring `dda.py`; `dda.vectors.test.ts` loading `../../../shared/dda_cases.json`.
- Engine end-of-session: compute local result → write `difficultyStates`/`difficultyChanges` locally → POST session → replace local state with server response (log mismatch to console in dev).
- i18n keys `dda.*` in en/as/bn.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] All shared vectors pass in Vitest; end screen shows the message for the resulting key; no level shown.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
