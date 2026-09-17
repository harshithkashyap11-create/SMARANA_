# 14 — Design System (Elderly-first)

Applies to all **patient** screens. Caregiver/doctor screens can be denser but must still meet AA contrast.

## Layout
- Mobile-first: design at 360×640, then scale up. Tablet/desktop: max content width 720px, centred.
- Fixed structure on every patient screen: top bar (back + title + Talk button), content, bottom nav (5 fixed items). Icon positions never change.
- One primary action per screen, full-width, at the bottom of the content.
- 2-column tile grid for sections; 1 column when `font_scale ≥ 1.4`.

## Sizing
- Touch targets ≥ 64×64 px; spacing between targets ≥ 12 px.
- Base font 20px; `font_scale` 1.0 / 1.2 / 1.4 / 1.6 multiplies everything (CSS `--scale`).
- Headings 28–32px. Body ≤ 12 words per line.
- Icons 40px in tiles, 28px in nav; always with a text label.

## Colour & contrast
- Tokens: `--bg, --surface, --text, --muted, --primary, --primary-text, --calm, --success, --warn`. Light and dark themes define all tokens; components only use tokens.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for icons. Never rely on colour alone (use icon + text).
- No pure red for feedback in games/quizzes. `--warn` is amber, used only for SOS and "need help".
- Reduce-motion respected: no auto-animations when `prefers-reduced-motion` or `accessibility.reduce_motion`.

## Copy tone
- Second person, warm, short. "Time for your medicine." not "Medication reminder: 8:00 AM dose."
- Never: "wrong", "failed", "error", "invalid", "sync", "database", percentages, levels.
- Mistakes in quizzes/games: "This is saved as {name}." / "It's here." Then move on.
- Loading: "One moment…". Empty: "Nothing here yet. Priya can add this for you." Error (rare): "Something didn't work. Let's try again." + big Retry.
- Every patient string is an i18n key.

## Components (build once in `shared/ui`, reuse everywhere)
`BigButton`, `IconTile`, `Card`, `ReminderCard`, `ConfirmDialog` (big Yes/No + TTS), `OrientationCard`, `PhotoStrip`, `OptionGrid` (2–4 large options for quizzes/games), `BreakPrompt`, `SupportiveEndScreen`, `OfflineChip`, `TalkButton`, `Keypad` (PIN), `SectionHeader` (with Replay instructions).

## Interaction
- Long-press (2s) for SOS; every destructive/critical action → `ConfirmDialog`.
- Undo toast (8s) for minor changes (e.g. "Marked as taken — Undo").
- Voice button always reachable (top-right), never overlapping content.
- Keyboard: PIN keypad is on-screen, never the system keyboard.

## Professional screens
- Dense tables allowed; still ≥ 44px targets; charts with labels and units; disclaimers visible on metrics pages: "Engagement and tracking support — not a diagnosis."
