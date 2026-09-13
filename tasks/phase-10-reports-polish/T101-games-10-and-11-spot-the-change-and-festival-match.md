# T101 — Games 10 & 11: Spot the Change and Festival Match

**Phase:** 10 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T092

## Read first
- `docs/08-games-catalog.md`

## Touches
- `frontend/src/games/modules/spot_the_change`
- `frontend/src/games/modules/festival_calendar`

## Goal
Two scenes with 1–4 differences (from pack routine_scene variants); festival↔season/state matching.

## Scope (do exactly this)
- Spot the Change requires pack scenes with `variants` — extend ContentItem.tags contract and importer.
- Festival Match with 2–4 options.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Per-game tests; seeds.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
