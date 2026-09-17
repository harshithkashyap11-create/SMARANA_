/**
 * Pattern Completion - difficulty configuration and pattern vocabulary.
 * Higher levels add reasoning complexity (longer patterns, more rules, closer
 * answer choices) rather than shrinking timers.
 */
export const GAME_ID = 'pattern_completion';
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export const CATEGORIES = {
  ALTERNATING: 'alternating',
  REPEATING_GROUP: 'repeating_group',
  QUANTITY: 'quantity',
  SHAPE_PROGRESSION: 'shape_progression',
  COLOUR_PROGRESSION: 'colour_progression',
  POSITIONAL: 'positional',
};

/** Symbol sets used to build patterns. Kept familiar and high-contrast. */
export const SYMBOL_SETS = {
  colours: [
    { id: 'blue', emoji: '🔵', labelKey: 'items.blueDot' },
    { id: 'red', emoji: '🔴', labelKey: 'items.redDot' },
    { id: 'yellow', emoji: '🟡', labelKey: 'items.yellowDot' },
    { id: 'green', emoji: '🟢', labelKey: 'items.greenDot' },
  ],
  shapes: [
    { id: 'triangle', emoji: '🔺', labelKey: 'items.triangle' },
    { id: 'circle', emoji: '⚫', labelKey: 'items.circle' },
    { id: 'square', emoji: '🟩', labelKey: 'items.square' },
    { id: 'star', emoji: '⭐', labelKey: 'items.star' },
  ],
  everyday: [
    { id: 'apple', emoji: '🍎', labelKey: 'items.apple' },
    { id: 'cup', emoji: '☕', labelKey: 'items.cup' },
    { id: 'flower', emoji: '🌻', labelKey: 'items.sunflower' },
    { id: 'leaf', emoji: '🍃', labelKey: 'items.leaf' },
  ],
};

/** Items usable for quantity progressions (countable, visually simple). */
export const QUANTITY_ITEMS = [
  { id: 'apple', emoji: '🍎', labelKey: 'items.apple' },
  { id: 'flower', emoji: '🌼', labelKey: 'items.blossom' },
  { id: 'star', emoji: '⭐', labelKey: 'items.star' },
];

export const DIFFICULTY_LEVELS = {
  1: {
    categories: [CATEGORIES.ALTERNATING],
    patternLength: 5,
    choiceCount: 2,
    similarity: 'low',
    hintsAllowed: 3,
    showRuleSupport: true,
    roundsPerSession: 5,
    reportEveryRounds: 1,
  },
  2: {
    categories: [CATEGORIES.ALTERNATING, CATEGORIES.REPEATING_GROUP],
    patternLength: 6,
    choiceCount: 3,
    similarity: 'low',
    hintsAllowed: 3,
    showRuleSupport: true,
    roundsPerSession: 6,
    reportEveryRounds: 1,
  },
  3: {
    categories: [CATEGORIES.ALTERNATING, CATEGORIES.REPEATING_GROUP, CATEGORIES.QUANTITY, CATEGORIES.SHAPE_PROGRESSION],
    patternLength: 6,
    choiceCount: 3,
    similarity: 'medium',
    hintsAllowed: 2,
    showRuleSupport: false,
    roundsPerSession: 6,
    reportEveryRounds: 1,
  },
  4: {
    categories: [
      CATEGORIES.REPEATING_GROUP,
      CATEGORIES.QUANTITY,
      CATEGORIES.SHAPE_PROGRESSION,
      CATEGORIES.COLOUR_PROGRESSION,
      CATEGORIES.POSITIONAL,
    ],
    patternLength: 7,
    choiceCount: 4,
    similarity: 'high',
    hintsAllowed: 2,
    showRuleSupport: false,
    roundsPerSession: 6,
    reportEveryRounds: 1,
  },
  5: {
    categories: [
      CATEGORIES.REPEATING_GROUP,
      CATEGORIES.QUANTITY,
      CATEGORIES.SHAPE_PROGRESSION,
      CATEGORIES.COLOUR_PROGRESSION,
      CATEGORIES.POSITIONAL,
    ],
    patternLength: 8,
    choiceCount: 4,
    similarity: 'high',
    hintsAllowed: 1,
    showRuleSupport: false,
    roundsPerSession: 6,
    reportEveryRounds: 1,
  },
};

export function getConfig(level) {
  const clamped = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(Number(level)) || MIN_DIFFICULTY));
  return { ...DIFFICULTY_LEVELS[clamped], level: clamped };
}
