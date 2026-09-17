# 05 — User Stories

Format: **ID — As a <role>, I want <thing> so that <why>.** Then acceptance criteria (AC) in Given/When/Then. Priority tag: MVP / v1 / v2. Each story maps to task cards in `tasks/` (see the "Tasks" line).

Personas used throughout:
- **Rao Garu** (72, Assamese-speaking, mild memory loss, uses a mid-range Android phone, poor eyesight, Wi-Fi only at home in the evening)
- **Priya** (Rao's daughter, primary caregiver, lives 40 km away, checks the app at night)
- **Dr. Deka** (neurologist, 60 patients, wants trends not raw logs)
- **Admin** (student's team member running the platform)

---

## Epic A — Entry & Identity

**A1 — As Rao, I want to log in with a 4-digit PIN so that I don't need to remember a password.** (MVP)
- Given the landing page, when I tap "I am a Patient", I see a big numeric keypad and my login id pre-filled from last time.
- When I enter the right PIN, I land on Home within 2s.
- When I enter a wrong PIN 5 times, I see "Let's take a break. Priya has been told." and cannot try again for 15 minutes; Priya receives an alert.
- Error copy never says "invalid credentials"; it says "That didn't match. Try again."
- Tasks: T010, T011, T020

**A2 — As Priya, I want to log in with email + password and see only my parents so that others' data is never visible to me.** (MVP)
- Given I'm assigned to Rao, when I log in, my patient list shows Rao only.
- Given I request `/patients/<other-id>/` directly, I get 404.
- Tasks: T010, T012, T013

**A3 — As Dr. Deka, I want my account to need admin approval so that random sign-ups can't see patient data.** (MVP)
- Given an unapproved doctor account, when I log in, I get "Your account is awaiting verification." and no data.
- Tasks: T010, T060

**A4 — As Rao, I want to pick my language and text size on the first screen and have them remembered.** (MVP)
- When I change language to Assamese, all visible text updates without reload; on next open it's still Assamese.
- Tasks: T015, T016

**A5 — As any user, I want to be logged out after inactivity, gently if I'm a patient.** (MVP)
- Patient: after 30 min idle, "Are you still there?" with a big Yes; no data loss.
- Professional: after 15 min idle, returned to login.
- Tasks: T014

---

## Epic B — Patient Home & Orientation

**B1 — As Rao, I want the home screen to tell me what day it is, where I am, and what's next.** (MVP)
- Home shows: greeting by name, day, date, time, `home_label`, next activity with time, one family photo.
- Text is ≥ 22px at scale 1.0; card fits above the fold on a 360×640 screen.
- Works offline from cached data.
- Tasks: T021, T022

**B2 — As Rao, I want big tiles for each section, always in the same place.** (MVP)
- 8 tiles in a fixed 2-column grid: Games, Medicines, Sleep, Memories, Calm, My people, Progress, Today's routine.
- Bottom nav: Home, Play, Wellness, Family, Settings — fixed order on every screen.
- Tasks: T021

**B3 — As Rao, I want to resume what I was doing if the app closes.** (MVP)
- Given I was mid-game, when I reopen, I see "Continue your game?" with Continue / Start over.
- Tasks: T036, T072

**B4 — As Rao, I want a walkthrough the first time and a Replay button later.** (v1)
- Tasks: T104

---

## Epic C — Routine, Reminders, Medicines

**C1 — As Rao, I want to see today's routine and respond to reminders with one tap.** (MVP)
- Reminder card shows icon, title, time, and four buttons: Taken / Remind me later / Skip / I need help.
- "Skip" on a medicine asks "Skip this medicine?" with Yes / No.
- Response is saved offline and shown as "Saved safely on this device".
- Tasks: T023, T024, T070

**C2 — As Priya, I want to create and edit Rao's routine so that reminders match his real day.** (MVP)
- Given a routine item, when I set time 8:30 and days Mon–Sun, Rao's device shows it after next sync.
- Given two items at the same time, I see a warning before saving (v1).
- Tasks: T041, T042

**C3 — As Dr. Deka, I want to add a medication so that it appears in Rao's routine and Priya is notified.** (MVP)
- Creating a medication with times 08:00, 20:00 creates two RoutineItems (source=doctor) and a caregiver alert "Prescription updated".
- Tasks: T052

**C4 — As Priya, I want to see whether Rao took his medicines today and this week.** (MVP)
- Today tab shows each medicine reminder with status and time responded.
- Tasks: T040

---

## Epic D — Games & Adaptive Difficulty

**D1 — As Rao, I want games that get a little harder when I do well and a little easier when I struggle, without ever being told I did badly.** (MVP)
- After a session, I see one of: "Great job! Next time will be a little more interesting." / "Nice work." / "Today's game will be a bit easier so you can enjoy playing." — never numbers.
- Difficulty moves at most ±1 per session and only after ≥ 3 sessions in the window (see DDA spec).
- Tasks: T030–T033

**D2 — As Rao, I want a "Looking for a challenge today?" toggle in the games area only.** (MVP)
- When on, the next session runs at level+1 (respecting caps); the DDA state itself is not changed by the toggle.
- Tasks: T033

**D3 — As Rao, I want the app to suggest a break if I'm tired.** (MVP)
- If mistakes ≥ 4 in a row, or reaction time doubles vs my session mean, or I've played > `session_cap_minutes` (default 20), I see "Would you like a short break?" with Yes / Keep playing.
- A break never lowers my difficulty.
- Tasks: T035

**D4 — As Rao, I want 12 games, some about my region.** (MVP: 6 / v1: 12)
- See `08-games-catalog.md`. Tasks: T034, T037, T038, T039, T100–T103

**D5 — As Dr. Deka, I want to see why a level changed and be able to override, lock, or cap it.** (MVP)
- Each DifficultyChange shows a sentence explanation and the session that triggered it.
- Override creates a DifficultyChange with reason `doctor_override` and an audit event.
- Tasks: T053

**D6 — As Priya, I want to try games without affecting Rao's levels.** (v1)
- Guest mode sessions are stored with `guest_mode=true` and excluded from DDA and metrics. Tasks: T105

---

## Epic E — Memories & Family

**E1 — As Priya, I want to upload photos and a short story of an occasion so that Rao can revisit it.** (MVP)
- Multipart upload with title, occasion, date, place, summary, tagged people. Photos compressed client-side to ≤ 1600px.
- Tasks: T043

**E2 — As Rao, I want to tap a memory and hear/see its story.** (MVP)
- Memory page shows photos in a swipeable strip and the summary in large text with a "Read to me" button (TTS).
- Tasks: T025

**E3 — As Rao, I want to be asked gentle questions about my memories.** (MVP)
- Question: "Who is this?" with 3 large photo/name options. Correct → "Yes! That's Priya." Wrong → "This is saved as Priya, your daughter." No red colour, no "wrong".
- Tasks: T026, T027

**E4 — As Rao, I want to see my family with photos and call them with one tap.** (MVP)
- Tap card → "Call Priya?" → Yes opens `tel:`. Tasks: T028

**E5 — As Rao, I want an SOS button that tells my caregivers I need help.** (MVP)
- Long-press 2s → confirm → caregivers get in-app + email (SMS v1). Tasks: T029, T045

---

## Epic F — Wellness

**F1 — As Rao, I want a calm-time breathing exercise with a slow voice.** (MVP) Tasks: T023b
**F2 — As Rao, I want to record when I slept.** (v1) Tasks: T106
**F3 — As Rao, I want to see an encouraging summary of my day.** (MVP) Tasks: T022
**F4 — As Rao, I want an "I feel confused" button that calms the screen and offers help.** (v1) Tasks: T107

---

## Epic G — Caregiver Portal

**G1 — As Priya, I want a dashboard for each parent I care for.** (MVP) Tasks: T040
**G2 — As Priya, I want alerts that explain exactly what happened and why.** (MVP)
- Alert shows rule name, plain explanation, timestamp, evidence links. I can acknowledge, add a note, forward to doctor. Tasks: T044, T045
**G3 — As Priya, I want to download a PDF report to take to the doctor.** (MVP) Tasks: T110
**G4 — As Priya, I want to record notes about Rao's day.** (MVP) Tasks: T046
**G5 — As Priya, I want a timeline of everything.** (v1) Tasks: T108
**G6 — As Priya, I want to reset Rao's PIN.** (MVP) Tasks: T012

---

## Epic H — Doctor Portal

**H1 — As Dr. Deka, I want a patient list with flags and last activity.** (MVP) Tasks: T050
**H2 — As Dr. Deka, I want per-domain trends over 7/30/90 days from real sessions.** (MVP) Tasks: T051
**H3 — As Dr. Deka, I want to assign exercises that appear in the patient's routine.** (MVP) Tasks: T054
**H4 — As Dr. Deka, I want to write structured notes with visibility control.** (MVP) Tasks: T055
**H5 — As Dr. Deka, I want a clinical PDF that says clearly it is not a diagnosis.** (MVP) Tasks: T110

---

## Epic I — Admin

**I1 — As Admin, I want to approve doctors and caregivers.** (MVP) Tasks: T060
**I2 — As Admin, I want to assign doctors and caregivers to patients with a reason and history.** (MVP) Tasks: T061
**I3 — As Admin, I want to manage regional content and game catalog.** (MVP) Tasks: T062, T090
**I4 — As Admin, I want to see audit history.** (v1) Tasks: T063

---

## Epic J — Offline

**J1 — As Rao, I want everything on my home screen to work without internet.** (MVP)
- With network off: login with PIN, home, routine, respond to reminders, play games, memories, my people, calm — all work. Sync copy is reassuring. Tasks: T070–T074
**J2 — As Priya, I want to be warned if Rao's device hasn't synced for 3 days, without Rao being worried.** (v1) Tasks: T075

---

## Epic K — Voice

**K1 — As Rao, I want to say "open my memories" and have it open.** (v1) Tasks: T080–T083
**K2 — As Rao, I want the assistant to speak slowly when I ask.** (v1) Tasks: T082
**K3 — As Rao, I want the language to not change by accident.** (v1) Tasks: T083

---

## Epic L — Regional content

**L1 — As Rao, I want games and memories to use places, festivals and tunes from Assam.** (MVP for 2 states, v1 for all 8) Tasks: T090–T093
