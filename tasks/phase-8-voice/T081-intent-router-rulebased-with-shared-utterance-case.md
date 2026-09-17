# T081 — Intent router (rule-based) with shared utterance cases

**Phase:** 8 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T080

## Read first
- `docs/10-voice-assistant-spec.md (Intents)`

## Touches
- `frontend/src/voice/router.ts`
- `frontend/src/voice/intents/*.json`
- `shared/intent_cases.json`

## Goal
`route(utterance, lang, ctx) → {intent, slots} | null` for the v1 intent set in en/as/bn with fuzzy family-name matching.

## Scope (do exactly this)
- Pattern files per language; section/game label matching via i18n; Levenshtein for names; ≥40 shared cases.
- Confirmation requirement encoded per intent (`requiresConfirm: true` for call/sos/set_reminder/skip).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- LLM fallback (T084).

## Acceptance criteria
- [ ] All shared cases pass; unknown utterance → null.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
