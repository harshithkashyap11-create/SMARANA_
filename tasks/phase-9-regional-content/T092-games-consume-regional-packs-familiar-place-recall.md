# T092 — Games consume regional packs; Familiar Place Recall uses known_places

**Phase:** 9 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T091, T038

## Read first
- `docs/08-games-catalog.md`

## Touches
- `frontend/src/games/modules/*`
- `frontend/src/games/modules/familiar_place_recall`

## Goal
All six MVP games pull assets from the active pack; new game 7 mixes pack places with the patient's own known_places.

## Scope (do exactly this)
- Replace default-pack references with `usePack()`; per-state scene for Tea Garden Attention; per-state rhythm for Rhythm Recall (rename UI label per state, key stays `bihu_rhythm_recall`).
- Familiar Place Recall module + GameDefinition seed.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Per-game tests with two fake packs produce different rounds; game 7 tests.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
