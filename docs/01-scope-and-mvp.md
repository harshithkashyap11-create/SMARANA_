# 01 — Scope & MVP Tiers

Every requirement from the spec, tagged. **Nothing is removed; everything is sequenced.**

- **MVP** — must exist for the end-of-project demo (see playbook §6).
- **v1** — build after MVP is stable. Still in the roadmap.
- **v2** — genuinely hard or needs infra/people we don't have. Documented, designed for, not built.

## Cross-cutting

| Requirement | Tier | Notes |
|---|---|---|
| Four role portals (Patient, Caregiver, Doctor, Admin) | MVP | Admin = Django Admin in MVP |
| Landing page with 4 role tiles, language, theme, font size | MVP | |
| Real backend permissions (not UI hiding) | MVP | Every phase |
| Light/dark mode, font scaling | MVP | CSS variables + user setting |
| Languages: English + Assamese + Bengali | MVP | Strings via i18next; one more NE language in v1 |
| Fourth NE language (Manipuri/Meitei or Khasi or Mizo) | v1 | Content, not code |
| Audit log of record access/changes | MVP (write) / v1 (UI) | Write audit rows from day 1; admin view later |
| Encryption at rest/in transit | v1 | TLS in deploy; DB-level encryption of PII fields v2 |
| Docker Compose deployment | MVP | |

## Patient portal

| Requirement | Tier |
|---|---|
| PIN login (4-digit) with lockout + caregiver notify | MVP |
| Home: greeting, Daily Orientation Card (day, date, time, "you are at home", next activity, family photo) | MVP |
| Today's routine with reminders; actions Taken / Later / Skip / Need help | MVP |
| Medicines page (read-only for patient; doctor/caregiver edit) | MVP |
| Cognitive games with DDA, 6 games | MVP |
| Cognitive games, 12 games | v1 |
| "Looking for a challenge today?" toggle | MVP |
| Break prompt on repeated mistakes / erratic pacing / long play | MVP (simple rules) |
| Memories page: photos/videos/text uploaded by caregiver | MVP (photos + text) / v1 (video) |
| Memory recognition quiz ("who is this?") with gentle feedback | MVP |
| My people (family with photos, relationships) | MVP |
| Calm time (guided breathing) | MVP |
| My progress (encouraging summary, streaks, no clinical numbers) | MVP |
| Sleep tracking (manual entry: bedtime/wake) | v1 |
| Emergency SOS → notifies caregivers (push + SMS/email) | MVP (in-app + email) / v1 (SMS) |
| Call family (tel: links) | MVP |
| In-app calling (WebRTC) | v2 |
| Voice assistant: open tabs, start games, set reminders, ask medicines, call | v1 (Phase 8) |
| Speak-slowly toggle; language lock | v1 |
| Local LLM | v2 (optional Groq fallback in v1) |
| Offline: routine, reminders, games, memories, my people | MVP (Phase 7) |
| Resume-where-you-left-off | MVP |
| Walkthrough mode + Replay instructions | v1 |
| Confirmation safeguards on calls / SOS / skip medicine; Undo | MVP |
| "I feel confused / need a break" mode | v1 |
| Fatigue detection during games | MVP (simple) / v1 (motor metrics) |
| Motor metrics (path efficiency, hesitation, trajectory) | v2 |
| Favourites + suggested activities | v1 |
| Reassuring sync copy ("Saved safely on this device") | MVP |
| Privacy toggles for memories | v1 |
| Mic/camera indicator | v1 |
| Guest practice mode | v1 |
| Patient profile: relatives, places, life events, work, songs, hobbies, soothing prompts, culture | MVP (data model + caregiver edit) |

## Caregiver portal

| Requirement | Tier |
|---|---|
| See assigned patients; switch between them | MVP |
| Today: routine + medicines + adherence | MVP |
| Edit routine / reminders (conflict detection) | MVP (edit) / v1 (conflict detection) |
| Upload memories (photos, text; later video, audio) | MVP |
| Manage family members ("my people") | MVP |
| Progress: game sessions, accuracy/RT trends, level changes | MVP |
| Alerts with explicit logic (2 days no login, missed meds ×N, level drops, low mood) | MVP (3 rules) / v1 (all) |
| Acknowledge alert, add note, forward to doctor | MVP |
| Receive SOS | MVP |
| Notes (non-clinical) | MVP |
| Reports: download PDF | MVP (basic) / v1 (full) |
| Timeline (master event log) | v1 |
| Care team view | v1 |
| Caregiver self check-in (stress, sleep) | v2 |
| Check-in "Are you okay?" | v1 |
| Handover between caregivers | v2 |
| Printable emergency card | v1 |
| Notification channels (push/SMS/email config) | v1 |
| Audit of edits with original values | v1 |
| Offline read of routines/meds/contacts | v1 |

## Doctor portal

| Requirement | Tier |
|---|---|
| Assigned patient list with cards (name, age, language, caregiver, status, last session, flags) | MVP |
| Patient metrics: per-session table + 7/30/90-day trends | MVP |
| Difficulty history with explanations; override / lock / cap | MVP |
| Assign exercises (game, level, duration, frequency, time slot, review date) → patient routine | MVP |
| Medication schedule edit (flagged for caregiver) | MVP |
| Flags/alerts: acknowledge, instruct, dismiss | MVP |
| Clinical notes with visibility level | MVP |
| Baseline details (diagnosis, scores, constraints, caps) | MVP |
| PDF clinical summary | MVP (basic) / v1 (full) |
| Review-due reminders on dashboard | v1 |
| Sync status / pending-offline indicator | v1 |
| Session timeout, password rules | MVP |

## Admin portal

| Requirement | Tier |
|---|---|
| User CRUD, roles, deactivate/archive | MVP (Django Admin) |
| Doctor/caregiver approval | MVP |
| Doctor–patient, caregiver–patient assignment with history | MVP |
| Regional content curation (languages, images, audio, per-state tags) | MVP (Django Admin) |
| Game catalog enable/disable, caps | MVP |
| Dashboard counts from DB | MVP |
| Audit history view | v1 |
| SOS events overview | v1 |
| Sync monitoring, retry | v1 |
| System health page | v2 |
| Security page (sessions, lockouts, resets) | v1 |
| Analytics (anonymised) | v2 |
| Backups/retention UI | v2 |
| Broadcast announcements, support tickets | v2 |
| MFA for admin | v1 |

## Explicitly deferred with reasons

- **WebRTC calling** — needs TURN servers, mobile permissions, and a lot of testing. `tel:` links deliver 80% of the value in MVP.
- **Local LLM** — on-device LLM on elderly users' low-end Android phones is not realistic in 2026. Rule-based intents cover the spec's listed commands. Cloud LLM fallback is a config flag.
- **Motor trajectory metrics** — needs careful signal processing and validation; a v2 research item.
- **System health dashboard** — use Docker healthchecks and logs for now.
