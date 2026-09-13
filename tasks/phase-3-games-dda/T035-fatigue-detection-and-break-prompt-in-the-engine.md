# T035 — Fatigue detection and Break Prompt in the engine

**Phase:** 3 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T032

## Read first
- `docs/07-dda-spec.md (Fatigue detection)`
- `docs/05-user-stories.md (D3)`

## Touches
- `frontend/src/games/engine/fatigue.ts`
- `frontend/src/shared/ui/BreakPrompt.tsx`

## Goal
Rule-based fatigue detection during play, a gentle break prompt, and correct session flags so DDA holds.

## Scope (do exactly this)
- `fatigue.ts` pure detector over the event stream (4 consecutive mistakes; RT > 2× running mean twice; 3 taps < 300ms; duration > `session_cap_minutes`).
- `BreakPrompt` ('Would you like a short break?' Yes / Keep playing). Yes → session ends `completed=false, abandoned_reason='break_prompt'`, `fatigueFlagged=true`. Keep playing → flag set, continue; do not prompt again for 3 rounds.
- Reuse in memory quiz (replace T027's ad-hoc rule with this module).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Vitest table tests for each rule; engine integration: accepting break yields a session the DDA holds on (assert via dda.ts).

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
