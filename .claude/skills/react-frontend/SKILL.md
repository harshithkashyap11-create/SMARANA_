---
name: react-frontend
description: Conventions for the Smārana React + TypeScript PWA under frontend/. Use this whenever creating or editing any component, page, hook, store, i18n file, style, or frontend test — especially for patient-facing screens, which must follow strict elderly-first accessibility and supportive-copy rules. Also covers the generated API client, TanStack Query, Zustand, and Tailwind token usage.
---

# React frontend conventions

Always read `docs/14-design-system.md` before building a patient screen. Use `references/accessibility-checklist.md` as the pre-finish check for any patient UI.

## Stack
React 18, TypeScript (strict), Vite, Tailwind (tokens via CSS variables), react-router v6, TanStack Query v5, Zustand (UI + auth state), Dexie (IndexedDB), i18next + react-i18next, vite-plugin-pwa (Workbox), Vitest + React Testing Library, Playwright.

## Structure
```
src/
  app/            router.tsx, providers.tsx, layouts/{PatientLayout,ProLayout}.tsx
  shared/
    ui/           BigButton, IconTile, Card, ConfirmDialog, OptionGrid, Keypad, OfflineChip, TalkButton, SectionHeader ...
    i18n/         en.json as.json bn.json  + index.ts
    hooks/        useOnline, useIdleLogout, useTts ...
    theme/        tokens.css (light/dark), scale
  api/            generated/ (orval from OpenAPI) + client.ts (auth headers, refresh) + queries/<domain>.ts
  db/             schema.ts (Dexie), outbox.ts, sync.ts, repo/<domain>.ts (read-through: Dexie first, network to refresh)
  features/<feature>/{components,hooks,api,store,index.ts}
  games/          engine/, dda.ts, modules/<gameKey>/
  voice/          stt.ts, tts.ts, intents/, router.ts
  content/        packs.ts
```

## Rules
- **Data access for patient features goes through `db/repo/*`**, never directly through the API client. Repos read Dexie first and refresh from network when online. This is what makes offline work without special-casing.
- Caregiver/doctor features use TanStack Query hooks in `api/queries/*` directly (online-first).
- All text through `t("key")`. Add keys to `en.json` and the same key to `as.json` and `bn.json` with value `"TODO: <english>"`. `npm run i18n:check` must pass.
- Components handle `loading | empty | error` with the design-system copy.
- Patient screens: `BigButton` for actions, `IconTile` for navigation, `ConfirmDialog` for anything critical, `OptionGrid` for choices. Do not hand-roll buttons.
- No numbers/percentages/levels in `features/patient/**` or `games/**` UI. Points only if `profile.showPoints`.
- Auth tokens live in `authStore` (memory) + encrypted refresh in Dexie `meta`. Never `localStorage`.
- Use tokens (`bg-[--surface]`, `text-[--text]`) — never raw Tailwind colours in patient screens.
- Each feature exports a route config from `index.ts`; `app/router.tsx` composes them by role.
- Keep components < 150 lines; extract hooks.

## API client
`npm run api:gen` regenerates `src/api/generated` from `backend/schema.yml`. Never hand-write types that the schema provides. If the backend changed, regenerate before writing UI.

## Testing
- Vitest + RTL for components: render with `renderWithProviders` (i18n, router, query client, fake repos).
- Pure logic (dda.ts, intents, reminder id generation) tested directly; DDA also runs `shared/dda_cases.json`.
- Playwright smoke flows live in `frontend/e2e/`; keep each < 60s.

## Commands
```
cd frontend
npm run dev            # vite
npm run lint && npm run typecheck && npm test -- --run
npm run i18n:check
npm run api:gen
npx playwright test e2e/<flow>.spec.ts
```
