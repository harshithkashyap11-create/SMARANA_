# T034 — Game 1 & 2: Memory Match and Sequence Recall

**Phase:** 3 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T032

## Read first
- `docs/08-games-catalog.md`
- `.claude/skills/cognitive-games/SKILL.md`

## Touches
- `frontend/src/games/modules/memory_match`
- `frontend/src/games/modules/sequence_recall`

## Goal
Two complete games on the engine using a default content pack (placeholder images/sounds in `public/content/default/`).

## Scope (do exactly this)
- Memory Match: grid/preview knobs per catalog; tap-to-flip; pairs from pack `dish`/`festival` images; hint = brief reveal.
- Sequence Recall: show sequence (colour tiles + optional tune notes) then reproduce; length/set size knobs; hint = replay once.
- `content/packs.ts` loader returning the default pack (regional packs arrive in T092).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Regional packs.
- Audio-only mode.

## Acceptance criteria
- [ ] Per-game tests from the skill; both playable at levels 1 and 8 with sessions created.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
