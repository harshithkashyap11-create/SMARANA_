# T038 — Game 5 & 6: Bihu Rhythm Recall and Daily Life Sequencing

**Phase:** 3 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T034

## Read first
- `docs/08-games-catalog.md`

## Touches
- `frontend/src/games/modules/bihu_rhythm_recall`
- `frontend/src/games/modules/daily_life_sequencing`

## Goal
Rhythm tap-back with audio from the pack's `tune` items; ordering steps of a daily activity from `activity` items.

## Scope (do exactly this)
- Rhythm: play pattern (visual pulses + audio), user taps back; timing tolerance by level; audio-only at L7+.
- Sequencing: shuffled photo steps; order by tap; partial credit in `score`.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Per-game tests; playable at levels 1 and 8; audio has a fake in tests.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
