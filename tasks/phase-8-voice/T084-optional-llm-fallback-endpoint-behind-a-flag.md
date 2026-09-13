# T084 — Optional LLM fallback endpoint behind a flag

**Phase:** 8 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T081

## Read first
- `docs/10-voice-assistant-spec.md (LLM fallback)`

## Touches
- `backend/apps/voice`
- `frontend/src/voice/router.ts`

## Goal
`POST voice/route/` calling a provider with a strict JSON schema, used only when rule routing fails and `VOICE_LLM_FALLBACK` is on.

## Scope (do exactly this)
- Provider abstraction with a fake in tests; confidence threshold; never returns free text; audit-free but rate-limited per user.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests with fake provider: low confidence → null; frontend only calls when online and flag set.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
