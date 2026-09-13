# T072 — Service worker precache/runtime caching and offline orientation/home

**Phase:** 7 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T071

## Read first
- `docs/09-offline-sync-spec.md (Service worker)`

## Touches
- `frontend/vite.config.ts`
- `frontend/src/features/patient/home`

## Goal
App shell, fonts, and media cached; Home and orientation card render entirely from Dexie when offline.

## Scope (do exactly this)
- Workbox config per spec (media CacheFirst, content SWR, professional endpoints NetworkOnly).
- Orientation computed client-side from `meta`, `reminders`, `familyMembers` when the network call fails/times out (3s).
- Update prompt: 'A new version is ready' with a big Reload.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Anything not listed above.

## Acceptance criteria
- [ ] Manual + Playwright: offline reload of `/patient` renders home with next activity and photo from cache.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
