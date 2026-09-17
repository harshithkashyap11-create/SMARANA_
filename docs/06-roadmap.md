# 06 — Roadmap & Phase Exit Criteria

Phases are sequential. Each phase has an **exit demo** — something the mentor can watch in under 5 minutes. Do not start the next phase until the exit demo works. Tasks within a phase are mostly independent unless a dependency is listed on the card.

## Phase 0 — Foundation (T001–T006)
Repo, Docker Compose, Django skeleton with custom User, React+Vite+PWA skeleton, CI, OpenAPI → TS client generation, test harnesses.
**Exit demo:** `docker compose up` → open frontend → it calls `GET /api/v1/health/` and shows "Backend OK". `pytest` and `npm test` are green in CI.

## Phase 1 — Auth, Roles & Assignments (T010–T016)
Custom user with roles, patient PIN login with lockout, professional login with approval gate, JWT, `/auth/me`, CareAssignment/DoctorAssignment models with scoping, landing page, language/theme/font settings, idle logout.
**Exit demo:** Four users log in from the landing page and land on four different (mostly empty) dashboards. Caregiver hitting another patient's URL sees 404. Wrong PIN ×5 locks.

## Phase 2 — Patient Core (T020–T029)
Home + orientation card, tiles + bottom nav, routine + reminders + responses, medicines (read), calm time, my people + call, memories view, memory quiz, SOS, progress summary. Online only for now.
**Exit demo:** Log in as Rao; see today; respond to a reminder; open memories; answer a "who is this?" quiz; press SOS and see it appear (in DB / caregiver notification log).

## Phase 3 — Games & DDA (T030–T039)
Game engine (session lifecycle, metrics, persistence), DDA pure function in Python + TS with shared test vectors, supportive message mapping, challenge toggle, break/fatigue detection, and the first 6 games: Memory Match, Sequence Recall, Object Sorting, Tea Garden Attention, Bihu Rhythm Recall, Daily Life Sequencing.
**Exit demo:** Play Sequence Recall 4 times badly → level drops with the exact explanation in DB. Play well 3 times → level rises. Challenge toggle bumps level for one session.

## Phase 4 — Caregiver Portal (T040–T046)
Patient switcher, Today tab, Progress tab (sessions, trends charts), routine editor, memory upload with people tagging, family editor, alerts list with acknowledge/forward, alert rules (3 rules in Celery), SOS receive, notes.
**Exit demo:** Priya edits routine → Rao sees it. Priya uploads a birthday memory → appears in Rao's quiz. Rao misses 3 medicines → alert appears with explanation.

## Phase 5 — Doctor Portal (T050–T056)
Dashboard cards, metrics summary endpoint + charts (7/30/90d), difficulty history + override/lock/cap, medications, exercise assignments → routine, clinical notes, baseline.
**Exit demo:** Dr. Deka assigns "Sequence Recall, level 2, 3×/week, mornings" → appears in Rao's routine. Locks difficulty → Rao's bad sessions no longer demote.

## Phase 6 — Admin (T060–T064)
Django Admin customised: approval workflow, assignments with reason/history, dashboard counts, game catalog, audit list (read-only), security actions (deactivate, force logout, PIN reset).
**Exit demo:** Admin approves a doctor, assigns them to Rao; doctor logs in and sees Rao. Admin unassigns; doctor's next request is 404. Audit rows exist.

## Phase 7 — Offline & PWA (T070–T076)
Dexie schema, outbox, sync engine (push/pull), idempotency on server, service worker precache + media runtime cache, offline PIN unlock, offline reminder generation, resume state, reassuring sync copy, device-offline alert.
**Exit demo:** The full offline test from playbook §6 with airplane mode.

## Phase 8 — Voice (T080–T084)
Web Speech STT/TTS wrapper, intent router (open section, start game, what medicines, set reminder, call X, read this), slow-speech toggle, language lock, mic indicator, optional LLM fallback behind flag.
**Exit demo:** Say "open my memories" (English and Bengali) → navigates. Toggle slow speech → TTS rate drops.

## Phase 9 — Regional Content (T090–T094)
Region/Language/ContentItem models, admin curation with review status, content pack endpoint + client loader, games consume packs, seed 2 states fully (Assam, Meghalaya or Manipur), scaffolds for the other 6.
**Exit demo:** Switch region → Tea Garden Attention and Familiar Place Recall show different places/images.

## Phase 10 — Reports, Polish, Remaining Games (T100–T112)
6 more games, walkthrough mode, guest mode, sleep log, confused mode, timeline, PDF reports (clinical + emergency card), notification preferences, print styles, final accessibility pass.
**Exit demo:** Doctor downloads a PDF with trends and the disclaimer. All 12 games playable.

## Parallel non-coding workstream (starts Phase 2)
Collect regional content: 20 places, 10 festivals, 10 dishes, 5 tunes (rights-cleared or self-recorded), 20 everyday-activity photos per state. Translate the ~300 UI strings into Assamese and Bengali with a native speaker; review by a second speaker. Track in `docs/13-regional-content.md`.
