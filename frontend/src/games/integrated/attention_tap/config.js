/**
 * Attention Tap - difficulty configuration.
 *
 * SAFETY: stimulus durations never drop below 1500 ms and there is always a
 * blank gap of at least 700 ms between stimuli. Nothing here flashes, strobes,
 * or demands reflex speed - the aim is sustained attention, not reaction sport.
 */
export const GAME_ID = 'attention_tap';
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export const MIN_STIMULUS_MS = 1500;
export const MIN_GAP_MS = 700;

/** Target category options. Each has a clear target set plus near/far distractors. */
export const STIMULUS_THEMES = [
  {
    id: 'flower',
    targetKey: 'games.attentionTap.target.flower',
    targets: [{ id: 'sunflower', emoji: '🌻', labelKey: 'items.sunflower' }],
    nearDistractors: [
      { id: 'blossom', emoji: '🌼', labelKey: 'items.blossom' },
      { id: 'cherryBlossom', emoji: '🌸', labelKey: 'items.cherryBlossom' },
      { id: 'tulip', emoji: '🌷', labelKey: 'items.tulip' },
    ],
    farDistractors: [
      { id: 'car', emoji: '🚗', labelKey: 'items.car' },
      { id: 'apple', emoji: '🍎', labelKey: 'items.apple' },
      { id: 'dog', emoji: '🐕', labelKey: 'items.dog' },
      { id: 'book', emoji: '📖', labelKey: 'items.book' },
    ],
    /** Used only at the highest level: "tap flowers, but not the red one". */
    inhibitor: { id: 'rose', emoji: '🌹', labelKey: 'items.rose' },
    inhibitionRuleKey: 'games.attentionTap.rule.notRedFlower',
  },
  {
    id: 'fruit',
    targetKey: 'games.attentionTap.target.fruit',
    targets: [{ id: 'apple', emoji: '🍎', labelKey: 'items.apple' }],
    nearDistractors: [
      { id: 'mango', emoji: '🥭', labelKey: 'items.mango' },
      { id: 'pear', emoji: '🍐', labelKey: 'items.pear' },
      { id: 'peach', emoji: '🍑', labelKey: 'items.peach' },
    ],
    farDistractors: [
      { id: 'cup', emoji: '☕', labelKey: 'items.cup' },
      { id: 'bird', emoji: '🐦', labelKey: 'items.bird' },
      { id: 'umbrella', emoji: '🌂', labelKey: 'items.umbrella' },
      { id: 'clock', emoji: '🕰️', labelKey: 'items.clock' },
    ],
    inhibitor: { id: 'cherries', emoji: '🍒', labelKey: 'items.cherries' },
    inhibitionRuleKey: 'games.attentionTap.rule.notCherries',
  },
];

export const DIFFICULTY_LEVELS = {
  1: { stimulusMs: 3000, gapMs: 1400, stimulusCount: 12, targetRatio: 0.45, distractorSimilarity: 'far', inhibition: false, hintsAllowed: 0, roundsPerSession: 2, reportEveryRounds: 1 },
  2: { stimulusMs: 2700, gapMs: 1200, stimulusCount: 14, targetRatio: 0.42, distractorSimilarity: 'far', inhibition: false, hintsAllowed: 0, roundsPerSession: 2, reportEveryRounds: 1 },
  3: { stimulusMs: 2300, gapMs: 1000, stimulusCount: 16, targetRatio: 0.38, distractorSimilarity: 'mixed', inhibition: false, hintsAllowed: 0, roundsPerSession: 2, reportEveryRounds: 1 },
  4: { stimulusMs: 1900, gapMs: 850, stimulusCount: 18, targetRatio: 0.35, distractorSimilarity: 'near', inhibition: false, hintsAllowed: 0, roundsPerSession: 2, reportEveryRounds: 1 },
  5: { stimulusMs: 1700, gapMs: 750, stimulusCount: 20, targetRatio: 0.32, distractorSimilarity: 'near', inhibition: true, hintsAllowed: 0, roundsPerSession: 2, reportEveryRounds: 1 },
};

export function getConfig(level) {
  const clamped = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(Number(level)) || MIN_DIFFICULTY));
  const base = DIFFICULTY_LEVELS[clamped];
  return {
    ...base,
    level: clamped,
    stimulusMs: Math.max(MIN_STIMULUS_MS, base.stimulusMs),
    gapMs: Math.max(MIN_GAP_MS, base.gapMs),
  };
}
