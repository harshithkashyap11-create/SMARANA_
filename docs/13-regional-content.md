# 13 — Regional Content Plan (8 states)

Content is the soul of this app and it is **not a coding task**. Start collecting in Phase 2, in parallel with coding. Store in the `content` app via Django Admin (Phase 9 tooling) — until then, in a shared spreadsheet with the columns below.

## Languages (initial)
| Code | Language | Script | Notes |
|---|---|---|---|
| en | English | Latin | base |
| as | Assamese | Bengali–Assamese | Web Speech: limited; TTS fallback bn-IN |
| bn | Bengali | Bengali | good STT/TTS support |
| mni | Manipuri (Meiteilon) | Meitei Mayek / Bengali | 4th language candidate |
| kha | Khasi | Latin | easy typography |
| lus | Mizo | Latin | easy typography |
| Others (Bodo, Garo, Nagamese, Nepali for Sikkim) | v2 | | |

Fonts: Noto Sans Bengali (as/bn), Noto Sans Meetei Mayek (mni). Bundle in the PWA precache.

## Per-state content pack (target counts for "complete")

| Kind | Count | Used by |
|---|---|---|
| place (landmark/market/river/hill with photo + 1-line note) | 20 | Familiar Place Recall, Tea Garden scene, memories prompts |
| festival (name, month/season, photo, 1-line) | 8 | Festival Match, Rhythm Recall theme |
| dish (photo, name in local language) | 10 | Memory Match, Object Sorting |
| tune (short royalty-free or self-recorded clip ≤ 15s) | 5 | Sequence Recall (audio mode), Rhythm Recall |
| sound (ambient: rain, market, birds, bell, boat) | 8 | Sound Match |
| activity scene (daily tasks: making tea, weaving, fishing, going to market — 3–7 step photo sets) | 6 | Daily Life Sequencing |
| word (common nouns with image, for Word Pairs) | 40 | Word Pairs |
| routine_scene (busy scene for Spot the Change / Attention) | 4 | Spot the Change, Attention |

States: Assam (AS), Arunachal Pradesh (AR), Manipur (MN), Meghalaya (ML), Mizoram (MZ), Nagaland (NL), Sikkim (SK), Tripura (TR).

Priority: **Assam and Meghalaya first** (student's likely reach), then Manipur, then the rest as scaffolds with ≥ 5 items per kind so the UI never breaks.

## Rights & review
- Photos: self-taken, family-contributed with consent, or CC0/Wikimedia Commons with attribution stored in `ContentItem.tags.attribution`.
- Audio: self-recorded or CC0. No commercial music.
- Every item goes `draft → reviewed → published`; reviewer must be a speaker of the language.

## UI strings
~300 keys in `frontend/src/shared/i18n/<lang>.json`. Process: `en.json` is authoritative; a script (`npm run i18n:check`) lists missing keys per language; translators fill a CSV export; `npm run i18n:import` writes back. Keep sentences short; elderly-first copy rules in `14-design-system.md` apply in every language.
