# Local demo progress — 17 September 2026

## Delivered

- Removed Spanish from the selectable UI languages and voice configuration. Existing Spanish preferences migrate to English; the historical database language is disabled rather than deleting content.
- Added Telugu, Manipuri (Meitei), and Mizo. Telugu has provisional core navigation, greetings, and account-form translations. Manipuri and Mizo are selectable but translation-pending, with an explicit English-fallback notice. These are **not complete or clinically reviewed translations**. Regional game packs remain English-only unless a complete translated pack exists. Speech availability depends on installed browser voices.
- Added account creation at `/register` for users, caregivers, and doctors. Patient accounts get a profile and consent settings; caregiver/doctor accounts require administrator approval. Doctor verification starts pending. Public admin registration is rejected; passwords use Django validation and hashing.
- Added user password sign-in at `/login/user`, retaining PIN sign-in. Existing PIN-encrypted device data requires the previous PIN in the optional device-PIN field; it is never erased or silently re-keyed.
- Added an idempotent development-only `seed_telemetry` command, run by the local launcher. The cohort contains exactly 3 users, 5 caregivers, 2 doctors, and 1 administrator in the current local database. There are 504 explicitly synthetic sessions (3 people × 12 games × 14 days), assigned care teams, and difficulty states. Synthetic trajectories are illustrative, not evidence of treatment effectiveness.
- Preserved prior pending language, speech-control, and same-origin admin-portal work in this progress commit.

## Credentials (local demo only)

Shared password for every account: `SmaranaDemo123!`.

| Role | Sign-in identifiers |
| --- | --- |
| Users | `user1@example.com`, `user2@example.com`, `user3@example.com` (or `RAO1234`, `USER2`, `USER3`) |
| Caregivers | `priya@example.com`, `caregiver2@example.com`, `caregiver3@example.com`, `caregiver4@example.com`, `caregiver5@example.com` |
| Doctors | `deka@example.com`, `doctor2@example.com` |
| Administrator | `admin` |

User password sign-in: <http://localhost:5173/login/user>. Optional legacy device PIN: `1234` for the seeded users. The legacy keypad PIN is separate from the shared account password. Administrator access: <http://localhost:5173/portal/admin>; the existing authenticator requirement remains enabled. Its local setup URI is in `.local/demo-setup.txt` (ignored by Git).

## Game review

Reviewed the 12-game registry and generators, scoring and interaction tests. Added 120 level-by-level checks (all twelve games, levels 1–10) for deterministic round generation, valid round counts, and renderer presence, plus a catalogue uniqueness check. Existing tests cover scoring, hint/replay behavior, preview timing, partial credit, audio sequencing, fatigue, session resume, and regional-content changes.

Games reviewed: Memory Match, Sequence Recall, Object Sorting, Tea Garden Attention, Bihu Rhythm Recall, Daily Life Sequencing, Familiar Place Recall, Who Is This, Word Pairs, Festival Match, Sound Match, and Spot the Change.

Content dependencies remain intentional: Who Is This needs family photos; Festival Match needs seasonal/month/state metadata; Sound Match needs both images and audio; Spot the Change needs scene variants. Fixtures supply those dependencies. This is an engineering/test review, not a clinical validation or a manual completion of every level.

## Verification

- Frontend: 329 tests passed, production build, lint and locale check passed.
- Backend: 176 tests passed in the full suite, including replacement of the obsolete Spanish preference test. Changed backend modules pass lint.
- Local cohort and all 11 password authentications verified against the persistent database.
- Local secrets/database/media remain untracked. Shared credentials must never be deployed as production accounts.
