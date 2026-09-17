# T015 — Language switching (en/as/bn) with persistence and Bengali-script font

**Phase:** 1 · **Size:** S (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T013

## Read first
- `docs/13-regional-content.md (Languages, UI strings)`

## Touches
- `frontend/src/shared/i18n`
- `frontend/public/fonts`

## Goal
Selecting a language updates all text instantly, persists, and renders Assamese/Bengali correctly.

## Scope (do exactly this)
- Bundle Noto Sans Bengali (woff2) and set `font_family` per language; html `lang` attribute updated.
- Persist selection: Dexie `meta.language` (create minimal Dexie `db/schema.ts` with `meta` table) and PATCH `/auth/me/preferences/` when logged in.
- `as.json`/`bn.json` get every key from `en.json` with `TODO:` values; `i18n:check` enforces key parity.
- Language selector as large tiles with native names.

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Voice locale (T083).
- Translations themselves (content workstream).

## Acceptance criteria
- [ ] Switching language changes the landing tagline without reload; reload keeps it; `lang` attr correct; i18n:check passes.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
cd frontend && npm run i18n:check
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
