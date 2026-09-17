# T003 — React + TypeScript + Vite + PWA skeleton with design tokens

**Phase:** 0 · **Size:** M (S≈30 min, M≈60, L≈90+; split L if needed) · **Depends on:** T001

## Read first
- `docs/02-architecture.md`
- `docs/14-design-system.md`

## Touches
- `frontend/`

## Goal
A Vite React app with the folder structure, Tailwind tokens, light/dark theme, font scaling, i18n wiring, and a health check call to the backend.

## Scope (do exactly this)
- Vite + React 18 + TS strict; folders from the react-frontend skill; ESLint + Prettier; Vitest + RTL with `renderWithProviders`.
- Tailwind with CSS-variable tokens in `shared/theme/tokens.css` for light and dark; `--scale` multiplier; `ThemeProvider` (theme + fontScale in Zustand, persisted to Dexie `meta` later — for now in memory).
- i18next with `en.json` and empty `as.json`/`bn.json`; `npm run i18n:check` script (node script comparing keys).
- vite-plugin-pwa with manifest (name Smārana, icons placeholder, standalone), precache app shell only.
- `shared/ui`: `BigButton`, `IconTile`, `Card` with tests.
- Home route shows 'Backend OK' after calling `/api/v1/health/` (proxy in vite config).

## Out of scope (do NOT do; add to tasks/IDEAS.md if tempted)
- Auth, routing by role, any feature.

## Acceptance criteria
- [ ] `npm run dev` shows the page; toggling theme and font scale visibly changes tokens.
- [ ] Lighthouse PWA installable check passes in Chrome (manual).
- [ ] `BigButton` test asserts min height 64px class present.

## Verification
```
cd frontend && npm run lint && npm run typecheck && npm test -- --run
cd frontend && npm run i18n:check
```

## Done checklist
- [ ] `/review-task` verdict READY
- [ ] `/finish-task` run (PROGRESS.md updated, committed)
