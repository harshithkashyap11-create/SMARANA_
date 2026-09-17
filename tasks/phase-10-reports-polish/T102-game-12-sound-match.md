# T102 — Game 12: Sound Match

**Phase:** 10 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T092

## Read first
- `docs/08-games-catalog.md`

## Touches
- `frontend/src/games/modules/sound_match`

## Goal
Hear a sound, pick the image; L6+ two-sound sequences; uses pack `sound` items.

## Scope (do exactly this)
- Audio fake in tests; replay button counts as hint.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [x] Per-game tests; seed.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [x] `/finish-task` run (PROGRESS.md updated, committed)
