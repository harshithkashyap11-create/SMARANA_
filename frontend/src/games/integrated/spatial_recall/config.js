/**
 * Spatial Recall - difficulty configuration.
 * Cells are never smaller than a comfortable touch target, so the grid grows
 * slowly and stops at 4x4.
 */
export const GAME_ID = 'spatial_recall';
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export const OBJECT_POOL = [
  { id: 'key', emoji: '🔑', labelKey: 'items.key', family: 'household' },
  { id: 'cup', emoji: '☕', labelKey: 'items.cup', family: 'household' },
  { id: 'book', emoji: '📖', labelKey: 'items.book', family: 'household' },
  { id: 'glasses', emoji: '👓', labelKey: 'items.glasses', family: 'household' },
  { id: 'umbrella', emoji: '🌂', labelKey: 'items.umbrella', family: 'household' },
  { id: 'apple', emoji: '🍎', labelKey: 'items.apple', family: 'fruit' },
  { id: 'banana', emoji: '🍌', labelKey: 'items.banana', family: 'fruit' },
  { id: 'mango', emoji: '🥭', labelKey: 'items.mango', family: 'fruit' },
  { id: 'flower', emoji: '🌻', labelKey: 'items.sunflower', family: 'nature' },
  { id: 'leaf', emoji: '🍃', labelKey: 'items.leaf', family: 'nature' },
  { id: 'clock', emoji: '🕰️', labelKey: 'items.clock', family: 'household' },
  { id: 'letter', emoji: '✉️', labelKey: 'items.letter', family: 'household' },
];

export const DIFFICULTY_LEVELS = {
  1: { rows: 2, cols: 2, objectCount: 1, observationMs: 8000, recallDelayMs: 500, recallTargets: 1, similarObjects: false, hintsAllowed: 3, roundsPerSession: 5, reportEveryRounds: 1 },
  2: { rows: 3, cols: 3, objectCount: 2, observationMs: 7000, recallDelayMs: 800, recallTargets: 1, similarObjects: false, hintsAllowed: 3, roundsPerSession: 5, reportEveryRounds: 1 },
  3: { rows: 3, cols: 3, objectCount: 3, observationMs: 6000, recallDelayMs: 1200, recallTargets: 1, similarObjects: false, hintsAllowed: 2, roundsPerSession: 6, reportEveryRounds: 1 },
  4: { rows: 4, cols: 4, objectCount: 4, observationMs: 5500, recallDelayMs: 1800, recallTargets: 2, similarObjects: true, hintsAllowed: 2, roundsPerSession: 6, reportEveryRounds: 1 },
  5: { rows: 4, cols: 4, objectCount: 5, observationMs: 4500, recallDelayMs: 2500, recallTargets: 2, similarObjects: true, hintsAllowed: 1, roundsPerSession: 6, reportEveryRounds: 1 },
};

export function getConfig(level) {
  const clamped = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(Number(level)) || MIN_DIFFICULTY));
  return { ...DIFFICULTY_LEVELS[clamped], level: clamped };
}
