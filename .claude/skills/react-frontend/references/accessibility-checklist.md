# Patient-screen accessibility checklist (run before /finish-task)

- [ ] Every interactive element ≥ 64×64 px (check with devtools at 360px width)
- [ ] Renders correctly at font_scale 1.6 without horizontal scroll or clipped text
- [ ] Light and dark themes both pass 4.5:1 text contrast (use tokens only)
- [ ] Exactly one primary action; it is full-width near the bottom
- [ ] Bottom nav present and in the fixed order: Home, Play, Wellness, Family, Settings
- [ ] Talk button top-right, not overlapping content
- [ ] All strings via i18n; `npm run i18n:check` clean
- [ ] No red for mistakes; no "wrong/error/failed/sync"; no numbers/percentages
- [ ] Critical actions (call, SOS, skip medicine, delete) use ConfirmDialog with TTS
- [ ] Images have alt text from content/family data
- [ ] `prefers-reduced-motion` respected
- [ ] Works with the fake repo in offline mode (`VITE_FAKE_OFFLINE=1`)
- [ ] Empty state has a friendly message naming the caregiver where relevant
