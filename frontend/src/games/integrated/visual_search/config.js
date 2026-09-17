/**
 * Visual Search - difficulty configuration and item content.
 * Difficulty is bounded 1-5 and translated into concrete round parameters here,
 * never inside the component.
 */
export const GAME_ID = 'visual_search';
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

/**
 * Items are grouped into families. "Similar" distractors are drawn from the
 * target's own family; "different" distractors come from other families.
 * labelKey feeds i18n so screen readers and non-English users get real words.
 */
export const ITEM_FAMILIES = {
  fruit: [
    { id: 'apple', emoji: '🍎', labelKey: 'items.apple' },
    { id: 'mango', emoji: '🥭', labelKey: 'items.mango' },
    { id: 'lemon', emoji: '🍋', labelKey: 'items.lemon' },
    { id: 'orange', emoji: '🍊', labelKey: 'items.orange' },
    { id: 'banana', emoji: '🍌', labelKey: 'items.banana' },
    { id: 'pear', emoji: '🍐', labelKey: 'items.pear' },
  ],
  household: [
    { id: 'key', emoji: '🔑', labelKey: 'items.key' },
    { id: 'cup', emoji: '☕', labelKey: 'items.cup' },
    { id: 'book', emoji: '📖', labelKey: 'items.book' },
    { id: 'shoe', emoji: '👟', labelKey: 'items.shoe' },
    { id: 'glasses', emoji: '👓', labelKey: 'items.glasses' },
    { id: 'umbrella', emoji: '🌂', labelKey: 'items.umbrella' },
  ],
  colourDot: [
    { id: 'blueDot', emoji: '🔵', labelKey: 'items.blueDot' },
    { id: 'purpleDot', emoji: '🟣', labelKey: 'items.purpleDot' },
    { id: 'greenDot', emoji: '🟢', labelKey: 'items.greenDot' },
    { id: 'redDot', emoji: '🔴', labelKey: 'items.redDot' },
    { id: 'yellowDot', emoji: '🟡', labelKey: 'items.yellowDot' },
    { id: 'orangeDot', emoji: '🟠', labelKey: 'items.orangeDot' },
  ],
  flower: [
    { id: 'sunflower', emoji: '🌻', labelKey: 'items.sunflower' },
    { id: 'blossom', emoji: '🌼', labelKey: 'items.blossom' },
    { id: 'cherryBlossom', emoji: '🌸', labelKey: 'items.cherryBlossom' },
    { id: 'hibiscus', emoji: '🌺', labelKey: 'items.hibiscus' },
    { id: 'tulip', emoji: '🌷', labelKey: 'items.tulip' },
  ],
  animal: [
    { id: 'dog', emoji: '🐕', labelKey: 'items.dog' },
    { id: 'cat', emoji: '🐈', labelKey: 'items.cat' },
    { id: 'cow', emoji: '🐄', labelKey: 'items.cow' },
    { id: 'bird', emoji: '🐦', labelKey: 'items.bird' },
    { id: 'fish', emoji: '🐟', labelKey: 'items.fish' },
  ],
};

/**
 * similarity:
 *   'none'   - all distractors come from other families (very obvious target)
 *   'low'    - mostly other families, a couple from the target family
 *   'medium' - half the distractors share the target's family
 *   'high'   - every distractor shares the target's family
 * Grids stay <= 20 cells so touch targets remain large on a tablet.
 */
export const DIFFICULTY_LEVELS = {
  1: { rows: 2, cols: 2, targetCount: 1, similarity: 'none', roundsPerSession: 5, responseWindowMs: null, hintsAllowed: 3, reportEveryRounds: 1 },
  2: { rows: 3, cols: 3, targetCount: 1, similarity: 'low', roundsPerSession: 6, responseWindowMs: null, hintsAllowed: 3, reportEveryRounds: 1 },
  3: { rows: 3, cols: 4, targetCount: 1, similarity: 'medium', roundsPerSession: 6, responseWindowMs: 30000, hintsAllowed: 2, reportEveryRounds: 1 },
  4: { rows: 4, cols: 4, targetCount: 2, similarity: 'high', roundsPerSession: 6, responseWindowMs: 25000, hintsAllowed: 2, reportEveryRounds: 1 },
  5: { rows: 4, cols: 5, targetCount: 2, similarity: 'high', roundsPerSession: 6, responseWindowMs: 20000, hintsAllowed: 1, reportEveryRounds: 1 },
};

export function getConfig(level) {
  const clamped = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(Number(level)) || MIN_DIFFICULTY));
  return { ...DIFFICULTY_LEVELS[clamped], level: clamped };
}
