# SMĀRANA release fixes

Validation performed locally on 16–17 September 2026. Changes are uncommitted. Existing working-tree changes were preserved; this report does not attribute the earlier engineering review, deployment files, or all existing security changes to this task.

## Results and baseline

| Gate | Result |
|---|---|
| Backend regression tests | 169 passed; baseline 165 passed once the test database was available |
| Frontend regression tests | 203 passed in 45 files; baseline 194 passed in 44 files |
| Backend strict typing | 0 errors in 219 files |
| Frontend typing | Passed |
| Backend and frontend lint | Passed, including frontend zero-warning policy |
| Database migrations | No changes detected; normal Django system check: no issues |
| Localization checks | Passed: 288 matching keys per catalog, scanner regression checks and patient-copy check |
| Production build | Passed through the browser test server |
| Browser tests | 10 passed in Chromium, including all three locales, two accessibility themes, mocked/real offline roundtrips, role login and PDF/check-in flows |
| Dependency security audits | npm: 0 vulnerabilities; pip-audit: no known vulnerabilities |
| Django deployment security checks | No issues, using production settings and synthetic configuration |

The original CI command, `mypy --strict $(find apps -name services.py)`, produced **88 errors across 21 files** in its imported dependency graph. Expanding the check after installing framework stubs exposed 654 errors across 72 files. All were resolved. CI now checks `mypy --strict apps config conftest.py manage.py`, covering 219 files, without exclusions or disabling strict mode.

The first backend baseline attempt could not connect to PostgreSQL. Validation subsequently used a dedicated database instance on port 55441 and an isolated seeded database with a backend on port 8001; the existing demo server and database were left separate. Local Python/PostgreSQL versions differ from CI's Python 3.12/PostgreSQL 16. Hosted GitHub Actions has not been dispatched or observed here; these are local gate results, with the corresponding CI checks updated.

## 1. Sensitive offline storage

**Root cause:** PIN encryption covered the refresh token, while Dexie tables and a service-worker media cache persisted patient content as plaintext. Repository-level filtering alone did not protect a copied database.

**Architecture:** one Dexie DBCore middleware encrypts complete sensitive records with AES-GCM-256, preserving existing CRUD and transaction abstractions. Each patient account has an independent random data key. An authenticated envelope binds the owner, table and record primary key through additional authenticated data; modifying ciphertext or moving it between identities fails authentication. Reads while locked or under another account do not expose protected values.

Protected categories include profiles/orientation, family names/contact information/photos, memories and stories/media, medicines/doses/instructions, routine/reminder content and responses, quiz answers, game sessions/resume/progress and difficulty metrics, sleep/mood/SOS logs, cached content packs, check-ins, assignments, favourites, accessibility/resume metadata, remembered login IDs, and pending/rejected sync payloads/errors. Private images are stored as encrypted bytes and displayed through temporary object URLs. New navigation no longer puts whole memory records into browser history state.

**Keys:** PBKDF2-SHA256 derives a PIN wrapping key with a random 16-byte salt and 210,000 iterations. That key wraps a random 256-bit data key and encrypts the refresh token, verifier and user summary. Only wrapped keys, ciphertext and bootstrap metadata persist. Imported data keys are nonextractable Web Crypto keys held in session memory. Every encryption uses a random 12-byte IV. No raw data key is saved beside the database.

**Indexes and bootstrap exceptions:** query indexes remain clear so existing offline scheduling and routing continue working. These include UUID associations, game/model identifiers, scheduling/retry timestamps and flags. Public game definitions, language preference, active patient/account UUIDs, failure counters/lock expiry and encrypted credential headers remain accessible while locked. These exceptions expose associations/activity patterns, but not readable patient names, stories, medication instructions, contact values or sync payloads. This is encrypted application storage, not complete device or index encryption.

**Migration:** after authenticating the existing owner/PIN, plaintext rows are rewritten inside a transaction alongside credential installation. Existing outbox IDs and idempotency keys survive unchanged. Legacy records with a conflicting explicit owner fail closed. A foreign account cannot silently take over the previous owner's legacy credentials. Owned legacy cached photos are encrypted before retiring the old plaintext media cache. Migration requires authentication: an old installation that has not yet unlocked/migrated can still contain its historical plaintext, and browser/OS backups or previously copied data cannot be retroactively erased.

**Offline sync:** repositories continue receiving normal decrypted objects while the vault is unlocked. Offline writes and the outbox/dead-letter queue pass through the same encryption middleware. The sync worker decrypts only the active account's records, preserves retry and rejection behavior, and sends the existing authenticated API payloads over the network. Existing backend idempotency remains in place. Refresh-token rotation now commits the encrypted token and its IV/header atomically.

The real-backend browser test downloads patient data, goes physically offline, records a reminder response and completes a five-round game, reloads the PWA, unlocks with the PIN, reconnects, drains the queue, inspects backend state and replays requests twice. It verifies one backend record per operation. It also inspects raw IndexedDB rows without decrypting them and checks that protected stores hold envelopes rather than plaintext titles/payloads/metrics.

## 2. Logout, shared devices and credential lifecycle

- **Logout/reload:** discard session keys/tokens, retain ciphertext and pending writes. Logout does not silently delete unsynced work. Correct PIN unlock restores the latest selected account; the login ID is re-entered because it is encrypted.
- **Account switching:** independent per-account wrapped keys isolate retained data. Returning through online authentication with the correct PIN reopens the original data key and queue. Cross-tab lock notifications clear other tabs' vault/auth sessions when a vault is locked, on supported browsers.
- **PIN change:** `changeOfflinePin(oldPin, newPin)` rewraps the same data key atomically; outbox ciphertext survives. A remote PIN reset without the old PIN fails closed instead of generating a replacement key and orphaning work. This storage function is implemented/tested; no new PIN-change UI or automatic integration into caregiver remote reset is claimed. Recover using the old PIN, sync, then change/rewrap or explicitly discard unrecoverable local data.
- **Failed PIN attempts:** the existing login path retains five-failure, fifteen-minute local lockout. Wrong PIN cannot decrypt. The help text no longer falsely states that a caregiver was notified. Local counters are a usability/rate control and do not prevent offline brute force of copied storage.
- **Revocation:** a rejected refresh marks offline credentials revoked and locks local access, retaining recoverable ciphertext. Legitimate online reauthentication can reopen retained records. A disconnected device cannot learn a new server revocation; remote wipe or immediate disconnected-device revocation is not implemented.
- **Deletion:** `deleteLocalPatientData()` refuses deletion when any pending or rejected queue records exist, including while locked. Explicit `discardPending=true` clears all local patient tables/credentials and legacy media cache, drops both runtime keys, and signals the current auth session to close; public game definitions remain. This is a device-wide storage API, not a new user-facing deletion button. An unused unsafe credential-forgetting function was removed.

## 3. Localization

**Root cause:** Assamese and Bengali each contained 149 TODO English entries; runtime catalog fallback and regional content fallback could conceal missing translations. Regional titles alone did not translate game answers/instructions.

The English, Assamese and Bengali patient/auth catalogs now have matching **288 keys**, including game labels, instructions, help/error/offline/navigation text and explicit content/review notices. Assamese and Bengali additions are **AI-assisted provisional translations**, with native-speaker and clinical/domain review still required. Existing translations were preserved. No native or clinical validation is claimed for any catalog. Date/time presentation uses the selected locale.

Runtime English catalog fallback is disabled. Sparse regional packs no longer fill missing content kinds from a generic English pack. A cached pack must match the requested region and language; unknown regions or missing Assamese/Bengali packs produce a localized unavailable state. Known English demo packs remain an intentional fallback and display an explicit English practice/unreviewed notice. Backend non-English packs require translated titles and localized metadata instead of silently supplying English answers/instructions. Blank translated titles are rejected. Review provenance is machine-readable in `review-status.json` and visible on the landing page.

CI validates catalog parity, TODO/placeholder markers, interpolation names, unintended identical English values, translation-call keys, practical hardcoded-English detection in patient/auth/shared/game UI, demo asset references and review metadata. Negative regression checks verify that broken catalogs/content references fail validation. Browser tests cover all three languages: role selection/login, dashboard, reminders/medicines, memories, games/content-unavailable handling, settings/navigation, SOS confirmation, offline status, wrong-PIN errors and persisted language after reload/unlock.

**Scope limits:** the technically covered demo UI languages are English, Assamese and Bengali. Complete reviewed Assamese/Bengali regional gameplay packs have not been created; their absence is explicit. English demonstration assets and region-specific titles are still unreviewed demonstration material. Caregiver/doctor/admin professional portals, entered clinical text, personal names and authored patient content are not represented as fully translated by the patient catalog work. Architecture extensibility is not evidence of 20+ completed languages.

## 4. Strict typing and CI

Maintained Django/DRF stubs, Django's mypy plugin and runtime generic support now describe models, managers/querysets, serializers, permissions and request users. Actual fixes cover services, views, admin actions, migrations, decorators, nullable dates, sync model unions, typed fixture contracts and settings. Voice provider output is validated before entering the typed intent contract. Runtime regression tests pass after these changes.

The global missing-import suppression was removed. Remaining exceptions are narrow and explained beside genuine third-party gaps: django-otp imports/reverse relation, django-environ, WeasyPrint adapters, factory-boy's newer Password declaration, SimpleJWT's unconstrained user generic and drf-spectacular's untyped extension class hook. Project admin methods receive actual return annotations; no untyped-definition suppression remains there. Strict mode and unused-ignore checking stay enabled.

CI now checks the full backend scope, migration consistency, catalogs/scanner/patient copy, all three locale browser scenarios and dependency vulnerability audits, alongside existing runtime/accessibility/offline checks.

## 5. Added and extended tests

- Seven real IndexedDB/Web Crypto integration cases: whole-record/raw-storage encryption and CRUD/retries/rejection; wrong PIN, logout/reload and account isolation; same-key PIN rewrap and guarded deletion; authenticated legacy migration retaining idempotency identities; encrypted private photos usable offline; refresh rotation/revocation/reauthentication; tampered-ciphertext rejection.
- Content-pack tests for unavailable translations/regions, rejecting wrong-language caches, explicit English demo provenance and not borrowing missing content kinds.
- Backend missing-language/no-English-substitution cases, localized metadata requirement and blank-title rejection.
- Catalog scanner positive/negative regression checks and three browser locale scenarios.
- Existing offline browser fixtures/assertions now understand encrypted storage; the real workflow additionally inspects raw ciphertext. Existing patient-image and translated-copy assertions were updated to the new boundaries/text.

## 6. Remaining risks and SIH claims

A **four-digit PIN has only 10,000 possibilities**. PBKDF2 raises attack cost but cannot make copied-device storage resistant to a determined offline attacker. Local lockout can be bypassed on a copied database. Strong stolen-device protection requires stronger credentials or a device-bound/OS-protected key design beyond this retained PIN workflow. Do not present this as equivalent to hardware-backed encryption.

Encryption protects locked persisted values, not an unlocked browser compromised by XSS/extensions, screenshots, browser RAM, malicious code or a user who knows the PIN. HTTPS, access control, CSP, production secrets, backups, device security and operational monitoring remain necessary. No penetration test, healthcare certification, end-to-end encryption of backend records, hardware-backed key storage, remote wipe or immediate offline revocation is claimed.

The general production `check --deploy` also reports 42 existing OpenAPI schema warnings, including serializer discovery and operation-ID collisions; these are not suppressed or presented as fixed. The specifically tagged deployment security check passes. Build emits existing chunk-size/dynamic-import warnings. Security audits report known advisories at run time, not proof that the application has no vulnerabilities.

For SIH, you can demonstrate encrypted offline patient records and a tested offline reload/sync/idempotency workflow; three technically covered patient UI catalogs with clear review status; and zero strict mypy project errors. **Do not claim 20+ completed languages, native/clinical validation, complete Assamese/Bengali gameplay content, complete professional-portal localization, unbreakable PIN encryption, or hosted CI execution verified here.**

## Reproducing the local gates

Run backend commands with an available dedicated PostgreSQL database and `DJANGO_SETTINGS_MODULE=config.settings.test`:

```sh
cd backend
.venv/bin/ruff check .
.venv/bin/mypy --strict apps config conftest.py manage.py
.venv/bin/python manage.py makemigrations --check --dry-run
.venv/bin/python manage.py check
.venv/bin/pytest -q
```

Frontend gates, from `frontend`:

```sh
npm run typecheck
npm run lint
npm test -- --run
npm run i18n:check
node --test scripts/check-i18n.test.mjs
npm run copy:check
npm audit --audit-level=low
SMARANA_REAL_BACKEND=1 SMARANA_BACKEND_URL=http://127.0.0.1:8001 VITE_API_PROXY_TARGET=http://127.0.0.1:8001 npx playwright test --workers=3
```

Real browser tests require an isolated migrated database seeded with `seed_demo` and a running dedicated backend. Backend dependency audit: `pip-audit -r backend/requirements.txt`. Production security check: `manage.py check --deploy --tag security` with valid explicit production environment values; this configuration check does not test a deployed TLS endpoint.

## Files changed for these fixes

Core storage/auth/media: `frontend/src/db/{vault,encryptedStorage,crypto,schema,media}.ts`, `frontend/src/shared/ui/PrivateImage.tsx`, patient login/auth store, private-image consumers, memory navigation and `frontend/vite.config.ts`.

Localization/content: `frontend/src/shared/i18n/{en,as,bn}.json`, `index.ts`, `review-status.json`, landing/game/date UI, `frontend/src/content/{packs,game-labels}.ts`, demo-tap labels, catalog scanner/regression checks and backend content pack view/tests.

Typing: backend requirements/configuration, account/auth/permission helpers, generic models/managers/serializers/admin classes, service/view modules and their typed regression fixtures/tests, settings, URL/management/migration annotations. The detailed path index below lists the task-touched source/configuration paths; existing edits in these files remain part of the shared working tree.

Validation/CI: frontend test mocks, encrypted IndexedDB integration tests, encrypted E2E inspection/fixtures, locale E2E, package manifest/lock (fake-indexeddb) and `.github/workflows/ci.yml`. Logs are in `.local/release-*.log` and remain ignored.

```text
.github/workflows/ci.yml
backend/apps/accounts/admin.py
backend/apps/accounts/authentication.py
backend/apps/accounts/serializers.py
backend/apps/accounts/services.py
backend/apps/accounts/tests/test_api.py
backend/apps/accounts/tests/test_models.py
backend/apps/accounts/tests/test_patient_login.py
backend/apps/accounts/views.py
backend/apps/admin_portal/context.py
backend/apps/alerts/rules.py
backend/apps/alerts/serializers.py
backend/apps/alerts/services.py
backend/apps/alerts/tests/test_notify.py
backend/apps/alerts/tests/test_phase10.py
backend/apps/alerts/tests/test_rules_and_api.py
backend/apps/alerts/tests/test_services.py
backend/apps/alerts/tests/test_sos_api.py
backend/apps/alerts/views.py
backend/apps/audit/admin.py
backend/apps/audit/models.py
backend/apps/audit/tests/test_models.py
backend/apps/clinical/serializers.py
backend/apps/clinical/tests/test_api.py
backend/apps/clinical/tests/test_dashboard.py
backend/apps/clinical/tests/test_phase5.py
backend/apps/clinical/tests/test_review_regressions.py
backend/apps/clinical/views.py
backend/apps/content/admin.py
backend/apps/content/contracts.py
backend/apps/content/management/commands/import_content.py
backend/apps/content/migrations/0002_seed_regions_languages_and_scaffolds.py
backend/apps/content/serializers.py
backend/apps/content/tests/test_api.py
backend/apps/content/tests/test_contracts.py
backend/apps/content/views.py
backend/apps/games/admin.py
backend/apps/games/dda.py
backend/apps/games/migrations/0001_initial.py
backend/apps/games/migrations/0003_seed_familiar_place_recall.py
backend/apps/games/migrations/0004_remaining_games.py
backend/apps/games/serializers.py
backend/apps/games/services.py
backend/apps/games/tests/test_api.py
backend/apps/games/tests/test_dda_vectors.py
backend/apps/games/views.py
backend/apps/memories/services.py
backend/apps/memories/tests/test_api.py
backend/apps/memories/views.py
backend/apps/patients/accessibility.py
backend/apps/patients/admin.py
backend/apps/patients/media.py
backend/apps/patients/serializers.py
backend/apps/patients/services.py
backend/apps/patients/tests/test_api.py
backend/apps/patients/tests/test_orientation.py
backend/apps/patients/tests/test_phase10.py
backend/apps/patients/tests/test_t020_api.py
backend/apps/patients/timeline.py
backend/apps/patients/views.py
backend/apps/reports/services.py
backend/apps/reports/tests/test_demo_walkthroughs.py
backend/apps/reports/tests/test_exports.py
backend/apps/reports/views.py
backend/apps/routines/serializers.py
backend/apps/routines/services.py
backend/apps/routines/tests/test_routines.py
backend/apps/routines/wellness.py
backend/apps/shared/middleware.py
backend/apps/shared/models.py
backend/apps/shared/permissions.py
backend/apps/shared/tests/factories.py
backend/apps/shared/tests/test_fixtures.py
backend/apps/shared/tests/types.py
backend/apps/sync/pull.py
backend/apps/sync/tests/test_api.py
backend/apps/sync/tests/test_favourites.py
backend/apps/sync/tests/test_pull.py
backend/apps/sync/views.py
backend/apps/voice/providers.py
backend/apps/voice/tests/test_api.py
backend/apps/voice/views.py
backend/config/settings/base.py
backend/config/tests/test_health.py
backend/config/tests/test_production_config.py
backend/config/urls.py
backend/conftest.py
backend/pyproject.toml
backend/requirements.txt
frontend/e2e/encrypted-db.ts
frontend/e2e/localization.spec.ts
frontend/e2e/offline-real.spec.ts
frontend/e2e/offline.spec.ts
frontend/package-lock.json
frontend/package.json
frontend/scripts/check-i18n.mjs
frontend/scripts/check-i18n.test.mjs
frontend/src/content/game-labels.ts
frontend/src/content/packs.test.ts
frontend/src/content/packs.ts
frontend/src/db/account.test.ts
frontend/src/db/crypto.test.ts
frontend/src/db/crypto.ts
frontend/src/db/encryptedStorage.test.ts
frontend/src/db/encryptedStorage.ts
frontend/src/db/media.ts
frontend/src/db/schema.ts
frontend/src/db/vault.ts
frontend/src/features/auth/LandingPage.test.tsx
frontend/src/features/auth/LandingPage.tsx
frontend/src/features/auth/PatientLoginPage.test.tsx
frontend/src/features/auth/PatientLoginPage.tsx
frontend/src/features/auth/authStore.ts
frontend/src/features/patient/confused/ConfusedMode.tsx
frontend/src/features/patient/games/GamePage.tsx
frontend/src/features/patient/home/PatientHomePage.test.tsx
frontend/src/features/patient/memories/MemoriesPage.tsx
frontend/src/features/patient/memories/quiz/MemoryQuizPage.tsx
frontend/src/features/patient/people/PeoplePage.tsx
frontend/src/games/engine/phase10.test.tsx
frontend/src/games/modules/daily_life_sequencing/index.tsx
frontend/src/games/modules/demo_tap.tsx
frontend/src/games/modules/familiar_place_recall/index.tsx
frontend/src/games/modules/memory_match/index.tsx
frontend/src/games/modules/new_games/index.tsx
frontend/src/games/modules/object_sorting/index.tsx
frontend/src/shared/i18n/as.json
frontend/src/shared/i18n/bn.json
frontend/src/shared/i18n/en.json
frontend/src/shared/i18n/index.ts
frontend/src/shared/i18n/review-status.json
frontend/src/shared/ui/OptionGrid.tsx
frontend/src/shared/ui/OrientationCard.tsx
frontend/src/shared/ui/PhotoStrip.tsx
frontend/src/shared/ui/PrivateImage.tsx
frontend/vite.config.ts
RELEASE_FIX_REPORT.md
```
