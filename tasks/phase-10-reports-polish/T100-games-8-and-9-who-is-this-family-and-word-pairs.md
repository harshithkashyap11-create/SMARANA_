# T100 — Games 8 & 9: Who Is This (family) and Word Pairs

**Phase:** 10 · **Size:** L (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T092

## Read first
- `docs/08-games-catalog.md`

## Touches
- `frontend/src/games/modules/who_is_this`
- `frontend/src/games/modules/word_pairs`

## Goal
Family recognition game from FamilyMember photos; word-pair memory in the patient's language from the pack.

## Scope (do exactly this)
- Who Is This: options from family; L5+ asks relationship; supportive copy identical to quiz.
- Word Pairs: pairs/delay knobs; text-only with large type.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Per-game tests; GameDefinition seeds.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
