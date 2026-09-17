# 03 — Data Model

Conventions:
- All primary keys are UUID (`id = UUIDField(primary_key=True, default=uuid4, editable=False)`).
- `TimeStamped` mixin: `created_at`, `updated_at`. `SoftDelete` mixin: `deleted_at` (null = live).
- `OfflineCapable` mixin (for anything the patient device creates): `device_updated_at DateTimeField`, `idempotency_key CharField(unique)`.
- Enums are `TextChoices`. Money/medical values are never floats where an integer will do.
- Every model has `__str__` and a `Meta.ordering`.

## accounts

**User** (custom `AbstractUser`)
- `role`: `patient | caregiver | doctor | admin`
- `display_name`, `preferred_language` (FK Language, null), `theme` (`light|dark`), `font_scale` (`1.0..1.6`)
- `is_approved` (bool, doctors/caregivers need admin approval), `approved_at`, `approved_by`
- `phone`, `email` (unique, nullable for patients)

**PatientCredential**
- `user` (O2O User role=patient), `pin_hash`, `failed_attempts`, `locked_until`
- `login_id` (short human-readable, unique, e.g. `RAO1234`)

**DoctorProfile**: `user` O2O, `specialisation`, `registration_number`, `clinic`, `verification_status` (`unverified|demo_verified|verified`)

**CaregiverProfile**: `user` O2O, `relationship_note`

**DeviceSession**: `user`, `device_id`, `last_seen_at`, `refresh_token_jti`, `push_subscription JSON`, `app_version`

## patients

**PatientProfile** (O2O User role=patient)
- `date_of_birth`, `gender`, `region` (FK content.Region), `cultural_notes` text
- `home_label` ("at home", "at daughter's house") — used by orientation card
- `known_places` JSON list of `{name, note}`
- `life_events` JSON list of `{title, year, note}`
- `work_history` text, `favourite_songs` JSON list, `hobbies` JSON list, `happy_things` JSON list, `soothing_prompts` JSON list (text / audio_url)
- `accessibility` JSON (`{large_text, high_contrast, reduce_motion, slow_speech}`)
- `session_cap_minutes` int null, `max_difficulty_level` int null (doctor caps)
- `challenge_mode_default` bool

**FamilyMember**
- `patient` FK, `name`, `relationship` (`daughter|son|spouse|grandchild|friend|...` + `relationship_label` free text in patient's language), `photo` (file), `phone`, `is_emergency_contact`, `linked_user` (FK User null — if they have the app), `order`

**CareAssignment**
- `patient` FK, `caregiver` FK User, `is_primary`, `active`, `assigned_by`, `assigned_at`, `ended_at`, `reason`

**DoctorAssignment**
- `patient` FK, `doctor` FK User, `active`, `assigned_by`, `assigned_at`, `ended_at`, `reason`

**ConsentSettings** (O2O PatientProfile)
- `share_memories_with_doctor`, `use_memories_in_quiz`, `share_mood_with_doctor`, `share_audio_with_doctor` (bools), `updated_by`

## routines

**RoutineItem**
- `patient`, `title`, `category` (`medicine|water|meal|doctor_visit|game|walk|call|sleep|custom`), `time_of_day` (time), `days_of_week` (JSON list 0–6), `start_date`, `end_date` null, `icon`, `note`
- `source` (`caregiver|doctor|system`), `source_ref` (UUID null — e.g. ExerciseAssignment id or Medication id), `created_by`

**Reminder** (materialised instance of a RoutineItem for a date)
- `routine_item` FK, `patient`, `scheduled_at` datetime, `status` (`pending|taken|later|skipped|help|missed`), `snoozed_until`
- Generated daily by Celery Beat for next 3 days; also generated client-side from RoutineItems when offline (same deterministic rule: `id = uuid5(NAMESPACE, f"{routine_item_id}:{date}")`).

**ReminderResponse** (OfflineCapable)
- `reminder` FK, `action` (`taken|later|skipped|help`), `responded_at`, `note`

**Medication**
- `patient`, `name`, `dose`, `times` JSON list of times, `instructions`, `prescribed_by` FK User(doctor), `active`, `start_date`, `end_date`, `flag_for_caregiver` bool

**MedicationLog** — derived view over ReminderResponses where routine category = medicine (no separate table).

**SleepLog** (OfflineCapable): `patient`, `date`, `bed_time`, `wake_time`, `quality` (1–5), `source` (`patient|caregiver`)

**MoodLog** (OfflineCapable): `patient`, `logged_at`, `mood` (`great|good|ok|low|bad`), `note`, `source`

## memories

**Memory**
- `patient`, `title`, `occasion` (`birthday|festival|wedding|trip|daily|other`), `occurred_on` date, `place`, `summary` text, `uploaded_by`
- `visibility` (`private|quiz|care_team`) — private = patient only; quiz = used in recognition; care_team = visible to doctor too
- `people` M2M FamilyMember

**MemoryMedia**: `memory` FK, `kind` (`photo|video|audio`), `file`, `caption`, `order`

**MemoryQuizAttempt** (OfflineCapable)
- `patient`, `memory` FK, `question_type` (`who|when|where|occasion`), `expected` text, `given` text, `correct` bool, `attempted_at`, `response_ms`

## games

**GameDefinition**
- `key` (unique slug, e.g. `memory_match`), `name`, `description`, `cognitive_domains` JSON (`memory|attention|sequencing|recognition|routine`), `min_level` 1, `max_level` 10, `enabled`, `is_regional`, `regions` M2M Region (empty = all)
- `metrics_schema` JSON (which metrics this game emits; validated on session save)

**DifficultyState** (per patient × game; OfflineCapable)
- `patient`, `game`, `level` int, `history_window` JSON (last N session summaries), `locked_by_doctor` bool, `cap_level` int null, `updated_at`

**GameSession** (OfflineCapable)
- `patient`, `game`, `level`, `challenge_mode` bool, `guest_mode` bool, `started_at`, `ended_at`, `duration_ms`
- `accuracy` float 0–1, `mean_reaction_ms` int, `mistakes` int, `hints_used` int, `rounds` int, `completed` bool, `abandoned_reason` (`user_exit|break_prompt|timeout|null`)
- `raw_events` JSON (optional compact event log), `fatigue_flags` JSON

**DifficultyChange**
- `patient`, `game`, `from_level`, `to_level`, `reason_code` (`promote|hold|demote|doctor_override|doctor_lock|cap|challenge_toggle`), `explanation` text (human-readable, e.g. "Accuracy under 60% across 3 rounds while reaction time increased"), `triggered_by_session` FK null, `actor` FK User null, `created_at`

## clinical

**ClinicalBaseline** (O2O PatientProfile): `diagnoses` text, `assessment_scores` JSON (`[{name, score, date}]`), `visual_limits`, `motor_limits`, `ideal_session_minutes`, `max_difficulty_level`, `recorded_by`, `recorded_at`

**ClinicalNote**: `patient`, `author`, `category` (`cognitive|medication|mood|sleep|routine|caregiver_feedback|general`), `status_summary`, `body`, `follow_up_date`, `visibility` (`doctor_only|care_team|patient_visible`), `reply_to` FK self null

**ExerciseAssignment**: `patient`, `doctor`, `game`, `start_level`, `target_minutes`, `times_per_week`, `time_slot` (`morning|afternoon|evening`), `review_date`, `active`, `notes`; on save → creates/updates RoutineItems (source=doctor)

**DdaOverride**: `patient`, `game`, `doctor`, `action` (`set_level|lock|unlock|cap`), `value` int null, `reason`, `created_at`

## alerts

**Alert**
- `patient`, `rule_key` (`no_login_2d|missed_meds_3in7|level_drop_x3|reaction_time_worsening|engagement_drop|low_mood_3d|sos|pin_lockout|device_offline_3d`)
- `severity` (`info|attention|high`), `title`, `explanation` (exact event, time, reasoning), `evidence` JSON (session ids, reminder ids…), `triggered_at`
- `status` (`open|acknowledged|forwarded|dismissed`), `acknowledged_by`, `acknowledged_at`, `forwarded_to` FK User(doctor) null, `notes`

**SosEvent**: `patient`, `triggered_at`, `location_text`, `notified` JSON (who, channel, when), `acknowledged_by`, `acknowledged_at`, `resolution_note`

**NotificationPreference**: `user`, `channel` (`in_app|push|email|sms`), `rule_key`, `enabled`

## content

**Region**: `code` (`AS|AR|MN|ML|MZ|NL|SK|TR`), `name`, `enabled`
**Language**: `code` (`en|as|bn|mni|kha|lus|...`), `name`, `native_name`, `enabled`, `tts_locale` (e.g. `bn-IN`), `font_family`
**ContentItem**: `region`, `kind` (`place|festival|dish|tune|activity|sound|word|routine_scene`), `title`, `title_translations` JSON `{lang: text}`, `image`, `audio`, `tags` JSON, `review_status` (`draft|reviewed|published`), `reviewed_by`
**UiString** (optional, if not using JSON files): `key`, `translations` JSON — v1 uses JSON files in repo; admin editing is v2.

## sync

**IdempotencyRecord**: `key` (unique), `user`, `model`, `object_id`, `created_at` — prevents duplicate inserts on retry.
**SyncCursor**: `device_session` FK, `last_pull_at` — server keeps for diagnostics; client keeps its own.

## audit

**AuditEvent**
- `actor` FK User null, `actor_role`, `action` (`view|create|update|delete|export|login|login_failed|assign|unassign|ack_alert|override_dda|...`), `target_model`, `target_id`, `patient` FK null (for "which patient's data"), `changes` JSON (before/after for updates), `ip`, `user_agent`, `created_at`
- Append-only: no update/delete permission for anyone, enforced by DB grant in prod and by model `save()` guard.

## Indexing hints
- `(patient, scheduled_at)` on Reminder; `(patient, game, ended_at)` on GameSession; `(patient, status)` on Alert; `(patient, created_at)` on AuditEvent.
