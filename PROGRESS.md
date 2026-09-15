# PROGRESS

Update this file at the end of every task (`/finish-task` does it). Keep it short. This is the memory Claude Code reads at the start of each session.

## Current phase
Phase 4 — Caregiver

## In flight
- None.

## Done
| Task | Date | Commit | Notes |
|---|---|---|---|
| T001 | 2026-09-14 | `feat(foundation): T001 repository skeleton and Docker Compose` | Compose development stack, Make targets, and minimal backend/frontend bootstraps. |
| T002 | 2026-09-14 | `feat(backend): T002 Django foundation and custom user` | Split environment settings, shared backend primitives, custom role-based user, admin registration, and database-aware health endpoint. |
| T003 | 2026-09-14 | `feat(frontend): T003 React PWA foundation and design tokens` | React PWA shell, accessible UI primitives, theme scaling, aligned locale catalogs, health status, and frontend test tooling. |
| T004 | 2026-09-14 | `ci: T004 mirror local verification in GitHub Actions` | GitHub Actions runs cached backend and frontend verification with PostgreSQL and Redis services on pushes and pull requests. |
| T005 | 2026-09-14 | `feat(api): T005 generate OpenAPI client` | Public OpenAPI schema, deterministic Orval client generation, bearer/refresh mutator, and generated health client integration. |
| T006 | 2026-09-14 | `feat(testing): T006 add reusable care scenario and demo seed` | Minimal patient assignment models, reusable role factories and fixtures, frozen time, and idempotent demo accounts. |
| T010 | 2026-09-14 | `feat(auth): T010 add professional JWT authentication` | Approval-gated professional login, rotating device-bound refresh tokens, logout, self context, preferences, and generated API contracts. |
| T011 | 2026-09-14 | `feat(auth): T011 add patient PIN login and lockout alerts` | Argon2 patient PIN login, 30-day device sessions, timed lockout with deduplicated caregiver alerts, and primary-caregiver PIN reset. |
| T012 | 2026-09-14 | `feat(patients): T012 add assignment-scoped patient reads` | Completed assignment history fields, role-scoped patient selectors, and read-only patient list/detail API contracts. |
| T013 | 2026-09-14 | `test(frontend): complete T013 browser login coverage` | Landing page, professional login, role routing, auth store, professional idle logout, and Playwright role-guard coverage. |
| T014 | 2026-09-14 | `feat(frontend): T014 add patient PIN login and idle prompt` | Remembered patient login ID, large keypad, gentle lock copy, patient shell, and 30-minute presence prompt. |
| T015 | 2026-09-14 | `feat(phase-1): complete T015 language preferences and T016 audit trail` | Native-language tiles, persisted en/as/bn selection, Bengali font bundle, and synchronized account preference support. |
| T016 | 2026-09-14 | `feat(phase-1): complete T015 language preferences and T016 audit trail` | Append-only audit app covers login success/failure and preference updates, with read-only admin visibility. |
| T020 | 2026-09-14 | `feat(patients): T020 add life-history, family, and consent APIs` | Full patient profile fields, role-scoped updates, family CRUD with signed media, consent controls, and audited changes. |
| T021 | 2026-09-14 | `feat(patient-core): complete T021-T024 daily support experience` | Patient home, orientation card, fixed navigation, read-through patient repository, and accessible tile layout. |
| T022 | 2026-09-14 | `feat(patient-core): complete T021-T024 daily support experience` | Encouraging progress summary API and cards with non-clinical completion, points, star streaks, and upcoming activities. |
| T023 | 2026-09-14 | `feat(patient-core): complete T021-T024 daily support experience` | Deterministic routine reminders, responses, medicines, daily materialisation, missed-reminder processing, and permission coverage. |
| T024 | 2026-09-14 | `feat(patient-core): complete T021-T024 daily support experience` | Patient routine and medicine screens with confirmation, snooze, help/call, undo feedback, and local-first response persistence. |
| T025 | 2026-09-14 | `feat(patient-core): complete T025-T029 memories and emergency support` | Consent-scoped memory APIs, offline cache, photo stories, tagged people, and read-aloud detail. |
| T026 | 2026-09-14 | `feat(patient-core): complete T025-T029 memories and emergency support` | Least-recent quiz questions across who/when/where/occasion, five-question repeat guard, family fallback, and idempotent attempts. |
| T027 | 2026-09-14 | `feat(patient-core): complete T025-T029 memories and emergency support` | Large-option memory quiz with supportive feedback, local-first attempts, and repeated-struggle break prompt. |
| T028 | 2026-09-14 | `feat(patient-core): complete T025-T029 memories and emergency support` | Emergency-first family cards with spoken call confirmation and one-tap telephone links. |
| T029 | 2026-09-14 | `feat(patient-core): complete T025-T029 memories and emergency support` | Persistent long-press SOS, idempotent events, in-app caregiver recipients, scoped acknowledgement, and emergency call actions. |
| T030 | 2026-09-14 | `feat(games): complete T030-T034 adaptive games foundation` | Seeded, resumable local-first session engine; metrics, persistence, backend catalog and session contracts. |
| T031 | 2026-09-14 | `feat(games): complete T030-T034 adaptive games foundation` | Pure Python DDA with 20 shared vectors, persisted difficulty state/change history, and 100% branch coverage. |
| T032 | 2026-09-14 | `feat(games): complete T030-T034 adaptive games foundation` | Matching TypeScript DDA, supportive end flow, offline prediction, and authoritative server reconciliation. |
| T033 | 2026-09-14 | `feat(games): complete T030-T034 adaptive games foundation` | Day-scoped challenge toggle raises only the played level while respecting game and doctor caps. |
| T034 | 2026-09-14 | `feat(games): complete T030-T034 adaptive games foundation` | Playable Memory Match and Sequence Recall with deterministic level knobs, hints, and default content assets. |
| T035 | 2026-09-14 | `feat(games): complete T035-T036 fatigue and session resume` | Shared fatigue detector, gentle break flow, session flags, configured play cap, quiz reuse, and DDA fatigue holds. |
| T036 | 2026-09-14 | `feat(games): complete T035-T036 fatigue and session resume` | Patient-scoped resume card restores the exact seeded round; start-over records a recoverable local abandonment. |
| T037 | 2026-09-14 | `feat(games): complete T037-T039 regional games and catalog` | Object Sorting supports tap-tap and drag placement, level-scaled categories/items, and explicit distractors; Tea Garden Attention adds density and a soft timed round at L4+. |
| T038 | 2026-09-14 | `feat(games): complete T037-T039 regional games and catalog` | Bihu Rhythm Recall uses testable audio with audio-only high levels; Daily Life Sequencing provides level-scaled ordering and partial scoring. |
| T039 | 2026-09-14 | `feat(games): complete T037-T039 regional games and catalog` | Six-game regional catalog, day-scoped challenge control, interrupted-game continuation, and Phase 3 mentor demo script. |
| T040 | 2026-09-14 | `feat(caregiver): complete T040-T042 portal and routine editor` | Assignment-scoped patient switcher, Today medicine statuses, response times, seven-day adherence, and device sync recency. |
| T041 | 2026-09-14 | `feat(caregiver): complete T040-T042 portal and routine editor` | Source ownership protection, before/after audit history, scoped history reads, and recoverable routine deletion. |
| T042 | 2026-09-14 | `feat(caregiver): complete T040-T042 portal and routine editor` | Schedule CRUD form with categories, day selection, validation, optimistic creation, and locked doctor items. |
| T043 | 2026-09-15 | `feat(caregiver): add memory upload and people tagging` | Scoped audited multipart creation, validated image uploads, quiz visibility, family tagging, client-side 1600px compression, and upload progress. |
| T044 | 2026-09-15 | `feat(alerts): add nightly caregiver alert rules` | Three boundary-tested rules, evidence refresh deduplication, 02:00 IST evaluation, scoped actions, assigned-doctor forwarding, and audited state changes. |

## Assumptions made (review with mentor)
- PostgreSQL and Redis are internal-only Compose services to avoid conflicting with host development databases; application and MinIO ports remain exposed.
- Assamese and Bengali catalogs mirror the English keys with `TODO:` values until translated content is supplied.
- T012 returns nullable patient-card age and language until T020 adds date of birth and the later preferences/content work establishes the persisted language source.
- Patient region is stored as a stable string key until T090 introduces the `content.Region` model.
- SOS uses one open patient alert whose evidence lists every active caregiver recipient; each emergency event remains separately idempotent and auditable.

## Known issues / tech debt
- Pin container and language dependency versions with lock files as the backend/frontend toolchains are completed in later foundation tasks.
- React Router remains on the project-mandated v6 line; npm reports two moderate advisories whose available fix upgrades to v7, so migration should be handled as a separate compatibility task.
- Replace the placeholder SVG PWA artwork with final install icons before release.
- `renderWithProviders` currently accepts a generic repository map; tighten it to concrete repository interfaces as offline repositories are introduced.
- T014's minimal Dexie `meta` store now also persists the language selection. IndexedDB is deliberately treated as optional during SSR and unit tests.
- The local database may retain the removed pre-commit T021 prototype reminder table; it is unreferenced and fresh installations do not create it.

## Next up
- T045 — Caregiver alerts tab and high-severity email delivery.
