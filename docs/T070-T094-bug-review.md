# T070–T094 bug review — 2026-09-16

Reviewed the 17 task specifications present in this range: T070–T076, T080–T084, and T090–T094. There are no T077–T079 or T085–T089 specifications.

## Screenshot

The screenshot confirms a local File URL pointing to `backend/apps/content/templates/admin/content/contentitem/change_list.html`. Opening a Django template directly displays its source. Use the running Django server at `/admin/content/contentitem/missing-translations/`. A report link was added to the Content items list, and the README explains the correct URL. Regression coverage verifies rendered content, navigation, and permission enforcement.

## Fixed

| Tasks | Findings and changes |
| --- | --- |
| T070–T071 | JSON string requests now receive Content-Type; abandoned game sessions are queued atomically; outbox commits trigger uploads; concurrent sync calls share one operation. |
| T071 | Invalid object IDs and database writes are rejected per item within savepoints. Idempotency records are checked against their user/model/object. Duplicate append-only objects cannot recompute DDA or accept another patient's object. Models without save handlers are rejected instead of acknowledged and silently discarded. Foreign memory references are rejected. Reminder snooze state follows the latest response. |
| T072 | Offline orientation recomputes current date/time and next pending activity. Orientation refresh preserves family members and phone metadata. Default visual/media files join the app precache. |
| T073 | Temporary refresh network/server failures preserve offline secrets; explicit authentication rejection clears them. |
| T074 | “Saved safely” appears after the reminder transaction commits, preventing reload immediately after confirmation from losing a write. Copy and translation checks pass. |
| T075 | Existing offline-device and rejection alert rules inspected; backend suite includes alert coverage. |
| T076 | Existing browser offline test exposed the premature save confirmation. It passes after the fix. |
| T080 | Recognition fallback no longer lets the previous recognizer's end event clear the fallback timer. Auto-stop completion reaches the UI. |
| T081–T082 | Game labels map to actual game keys. Reminder hours normalize to HH:mm and invalid times are rejected. |
| T083–T084 | Unlocked language commands now change language; the action rechecks the lock. Optional fallback network failure returns no command. |
| T090 | Report is linked, checks content-view permission, counts empty and whitespace-only translations, and renders through Django. Items are fetched once for all languages. The publish action rejects reviewed records with no reviewer. |
| T091 | Failed regional downloads retain the Dexie pack. Wi-Fi prefetch includes both image and audio, with settled failures. Musical notes come from tags rather than treating audio URLs as note sequences. |
| T092–T093 | Game patient settings are cached for offline game startup. Familiar Place Recall consumes place items and saved known places rather than word items. |
| T094 | Reimport preserves curated translations, reviewer, and publication state. |

## Follow-up implementation completed

- T071: incremental pull includes patient settings, family, memories, medications, routine rules, reminders/responses, game definitions and difficulty states, with deletion records. Client/server reminder UUID5 generation agrees beyond the cached horizon. Memory quizzes work offline and respect consent and visibility.
- T073: cached metadata, repositories, query keys and upload batches are scoped to the signed-in patient. Legacy metadata is adopted only when the remembered identity proves ownership.
- T076: a separate real-backend browser test plays a game offline, responds to a reminder, reloads/unlocks offline, reconnects and verifies database records and replay idempotency. CI includes this test.
- T080–T084: comfort settings sync with timestamp conflict handling; action speech and regional game aliases are translated. An optional bounded HTTP JSON voice provider is implemented and disabled until configured.
- T091–T094: games consume activity steps, note sequences and selected place illustrations. Sparse memory packs and all seven existing games have regional/high-level coverage. The importer validates media paths and attribution, imports files and preserves curated records.
- Additional working-site fixes: persistent local startup, media/admin proxies, first-load service-worker control, breathing practice, cached progress and offline SOS delivery. Sleep logging was subsequently implemented in T106.

## Regional content and release limits

Original CC0 demo illustrations and synthesized practice tones are supplied for all eight state packs: 101 items each for Assam and Meghalaya and five each for the other states. These are explicitly generic practice assets, not authentic recordings or documentary regional imagery. Imported records remain drafts. Authentic culturally specific material, native-speaker verification and editorial approval remain human publication requirements; the demo assets do not satisfy those claims.

T100–T108 were subsequently implemented: additional games, favourites, walkthroughs, guest practice, wellbeing logs, break mode and caregiver timeline/care-team tools. Reports and remaining polish (T109–T112) are next.

## Verification

The follow-up frontend suite passes 165 tests; lint and type checking pass. All 124 backend tests pass, as do Ruff and migration checks. Both browser offline tests pass: the original mocked regression and the real-backend game/reminder round trip. Translation-key, patient-copy and whitespace checks pass. Backend tests use a separate test database on the isolated local PostgreSQL instance; the working demo database is retained. The admin regression covers report rendering, permissions, empty translations and publication review checks.
