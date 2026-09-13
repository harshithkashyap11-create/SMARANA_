# T037 — Game 3 & 4: Object Sorting and Tea Garden Attention

**Phase:** 3 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T034

## Read first
- `docs/08-games-catalog.md`

## Touches
- `frontend/src/games/modules/object_sorting`
- `frontend/src/games/modules/tea_garden_attention`

## Goal
Two more games; Object Sorting with tap-tap and drag; Tea Garden scene from the pack's `routine_scene`.

## Scope (do exactly this)
- Object Sorting: categories/items knobs; distractors at L6+; drag with tap-tap alternative.
- Tea Garden Attention: find N targets in a scene with distractor density; time limit (soft arc) from L4.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Per-game tests; playable at levels 1 and 8.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
