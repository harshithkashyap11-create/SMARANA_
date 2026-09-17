# 02 — Architecture

## One-paragraph summary

A **Django + DRF** backend is the system of record and the permission boundary. A **React + TypeScript PWA** is the patient/caregiver/doctor UI, installed on the patient's phone and able to run fully offline for patient features via **IndexedDB + an outbox** that syncs when online. The **Admin portal is Django Admin** (customised) for v1. Voice runs in the browser (Web Speech API) with a rule-based intent router. Adaptive difficulty is a **pure, deterministic function** implemented identically in Python and TypeScript so the client can adapt offline and the server can verify.

```
┌──────────────────────────────┐        ┌────────────────────────────────┐
│  React PWA (frontend/)       │  HTTPS │  Django + DRF (backend/)        │
│  - Patient / Caregiver /     │◄──────►│  - Auth (JWT), roles, scoping   │
│    Doctor UIs                │  JSON  │  - REST API (/api/v1/…)         │
│  - IndexedDB (Dexie)         │        │  - Sync endpoints (push/pull)   │
│  - Outbox + Service Worker   │        │  - DDA service (Python)         │
│  - DDA (TypeScript)          │        │  - Reports (WeasyPrint)         │
│  - Web Speech STT/TTS        │        │  - Django Admin = Admin portal  │
└──────────────────────────────┘        │  - Celery: reminders, alerts    │
                                        └───────┬───────────┬────────────┘
                                                │           │
                                          PostgreSQL     Redis / MinIO
```

## Why these choices (so the student can defend them)

| Decision | Why | Alternative rejected |
|---|---|---|
| Django Admin as admin portal | Admin has 11 sections in the spec; Django Admin gives 80% for free with permissions, audit hooks, filters. Saves 2–3 weeks. | React admin — v2 if needed |
| JWT (SimpleJWT) not sessions | PWA offline needs a locally-held credential; short-lived access + refresh token in memory/IndexedDB works. Session cookies + CSRF are awkward with service workers. | Session auth |
| Pure-function DDA in both languages | Patient plays offline → client must adapt. Server must be source of truth → recompute on sync. Shared JSON test vectors prevent drift. | Server-only DDA (breaks offline) |
| Outbox pattern with client UUIDs | Records are created offline with no server. Client generates `id` (UUID v4) + `idempotency_key`; server upserts. Retries are safe. | Auto-increment IDs (impossible offline) |
| Web Speech API | Zero infra, works on Chrome/Android, supports bn-IN; Assamese TTS coverage is spotty — fall back to Bengali voice. | Whisper server — v2 if Web Speech quality is poor |
| TanStack Query + Dexie | Query for server state with cache; Dexie as the *persistent* cache and outbox. Query's `persistQueryClient` to IndexedDB is an option later. | Redux |
| Vite + vite-plugin-pwa | Workbox precaching of app shell; runtime caching of media. | CRA (dead) |
| Celery + Beat | Reminder scheduling, alert rule evaluation, offline-device warnings. | Django-Q, cron |
| WeasyPrint | HTML→PDF; reuse React-like templates in Django templates. | ReportLab (tedious) |

## Backend structure

```
backend/
  config/            settings (base/dev/prod), urls, celery
  apps/
    accounts/        User (custom, role field), PatientPIN, DeviceSession, login lockout
    patients/        PatientProfile (life-history fields), FamilyMember, Preferences, Assignments (doctor/caregiver ↔ patient)
    routines/        RoutineItem, Reminder, ReminderResponse (Taken/Later/Skip/Help), Medication, MedicationLog, SleepLog, MoodLog
    memories/        Memory (photo/video/text), MemoryQuizAttempt
    games/           GameDefinition, GameSession, DifficultyState, DifficultyChange, dda.py
    clinical/        ClinicalBaseline, ClinicalNote, ExerciseAssignment, DdaOverride
    alerts/          AlertRule evaluation (Celery), Alert, SosEvent
    content/         Region (8 states), Language, ContentItem (place/festival/dish/tune/…), CulturalPack
    sync/            push/pull endpoints, SyncCursor, IdempotencyRecord
    audit/           AuditEvent + middleware/signal helpers
    reports/         PDF generation (WeasyPrint templates)
  shared/            base models, permissions, pagination, exceptions
```

Rules:
- `views.py` are thin. `serializers.py` validate shape. `services.py` hold logic and are unit-tested directly.
- `permissions.py` in each app; object scoping in `get_queryset()`.
- Signals only for audit writes. No business logic in signals.

## Frontend structure

```
frontend/src/
  app/               router, providers, layouts per role
  shared/            ui components (BigButton, IconTile, Card…), hooks, i18n, theme
  db/                Dexie schema, outbox, sync engine
  api/               generated client from OpenAPI (orval) + auth
  features/
    auth/            landing, patient PIN login, professional login
    patient/         home, orientation card, routine, medicines, memories, my-people, calm, progress, sos
    games/           engine, dda.ts, 12 games, break detection
    caregiver/       patients list, today, progress, alerts, memories upload, routine editor, reports
    doctor/          patients, metrics, difficulty, assignments, notes, reports
    voice/           intents, stt, tts, slow-speech
  content/           regional packs loader
```

## Request flow examples

**Patient marks medicine "Taken" offline**
1. UI writes `ReminderResponse{id: uuid, reminder_id, action:'taken', device_updated_at}` to Dexie + outbox.
2. UI shows "Saved safely on this device".
3. Service worker `sync` event / app foreground → sync engine POSTs outbox batch to `/api/v1/sync/push`.
4. Server upserts by `id`, records `idempotency_key`, returns accepted ids + any conflicts.
5. Caregiver dashboard (online) polls/pulls and shows adherence.

**Doctor assigns exercise**
1. Doctor UI POST `/api/v1/clinical/assignments/`.
2. Service creates `ExerciseAssignment` and derived `RoutineItem`s for the patient.
3. Patient's next `/sync/pull` receives new routine items.

**Difficulty adjustment**
1. Game ends → client computes `GameSession` metrics → calls `dda.next(state, session)` (TS) → stores new `DifficultyState` + `DifficultyChange{reason}` locally, shows supportive message.
2. On sync, server re-runs `dda.next` (Python) on the same inputs; if the result differs (it shouldn't), server value wins and a warning is logged.

## Environments

- `docker-compose.yml`: postgres, redis, minio, backend, celery, celery-beat, frontend (vite dev). One command: `docker compose up`.
- `.env.example` documents every variable.
- CI: GitHub Actions running the same verification commands as `CLAUDE.md`.

## Security baseline (v1)

- JWT access 15 min, refresh 7 days (patients: 30 days, device-bound). Rotation on refresh.
- Patient PIN hashed (Argon2). 5 failed attempts → 15-minute lockout + caregiver alert.
- Professional passwords: Django validators, min 12 chars. Session idle timeout enforced client-side (auto-logout) and server-side (short access tokens).
- All list endpoints scope by assignment in `get_queryset`. Detail endpoints return 404 (not 403) for unassigned patients to avoid existence leaks.
- Media served via signed URLs (MinIO/S3 presigned, 10-minute expiry).
- Admin MFA: v1 via django-otp.
