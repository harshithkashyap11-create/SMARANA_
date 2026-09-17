# T091 — Content pack endpoint (versioned, cacheable) and client loader

**Phase:** 9 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T090, T072

## Read first
- `docs/04-api-contract.md (content/pack)`
- `docs/09-offline-sync-spec.md`

## Touches
- `backend/apps/content/views.py`
- `frontend/src/content/packs.ts`

## Goal
`GET content/pack/?region=&lang=` returns published items grouped by kind with a version hash; client caches it in Dexie and media in the SW cache.

## Scope (do exactly this)
- ETag/version; media URLs stable (public bucket for published content only).
- Client: `loadPack(region, lang)` → Dexie `contentPacks`; prefetch media on Wi-Fi; fallback to default pack per kind when a state lacks items.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Tests: unpublished excluded; version changes when an item is published; client falls back per kind.

## Verification
```
cd backend && ruff check . && pytest -q
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
