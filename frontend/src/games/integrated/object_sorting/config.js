import { COGNITIVE_DOMAINS } from '../shared/gameTypes.js';
import { clampDifficulty } from '../shared/gameMetrics.js';
import { ITEM_CATEGORIES } from '../shared/itemLibrary.js';

export const GAME_ID = 'object_sorting';

/** Every category the game can show. Labels come from the i18n layer. */
export const CATEGORY_DEFS = [
  { id: ITEM_CATEGORIES.FOOD, labelKey: 'games.categories.food', emoji: '🍽️' },
  { id: ITEM_CATEGORIES.CLOTHING, labelKey: 'games.categories.clothing', emoji: '👕' },
  { id: ITEM_CATEGORIES.TRANSPORT, labelKey: 'games.categories.transport', emoji: '🚌' },
  { id: ITEM_CATEGORIES.TOOLS, labelKey: 'games.categories.tools', emoji: '🔧' },
  { id: ITEM_CATEGORIES.HOUSEHOLD, labelKey: 'games.categories.household', emoji: '🏠' },
];

/**
 * Category pairs that share context and therefore take longer to separate.
 * Used when a level asks for "similar" categories.
 */
export const SIMILAR_CATEGORY_SETS = [
  [ITEM_CATEGORIES.TOOLS, ITEM_CATEGORIES.HOUSEHOLD],
  [ITEM_CATEGORIES.FOOD, ITEM_CATEGORIES.HOUSEHOLD],
  [ITEM_CATEGORIES.CLOTHING, ITEM_CATEGORIES.HOUSEHOLD],
];

/**
 * `emptyCategories` adds a visible group that no object belongs to. It raises
 * executive load without making any single object ambiguous.
 */
export const DIFFICULTY_LEVELS = [
  { level: 1, objectCount: 4, categoryCount: 2, useSimilarCategories: false, emptyCategories: 0, hintsPerRound: 2 },
  { level: 2, objectCount: 6, categoryCount: 2, useSimilarCategories: false, emptyCategories: 0, hintsPerRound: 2 },
  { level: 3, objectCount: 8, categoryCount: 3, useSimilarCategories: false, emptyCategories: 0, hintsPerRound: 1 },
  { level: 4, objectCount: 10, categoryCount: 3, useSimilarCategories: true, emptyCategories: 1, hintsPerRound: 1 },
  { level: 5, objectCount: 12, categoryCount: 4, useSimilarCategories: true, emptyCategories: 1, hintsPerRound: 1 },
];

export function getLevel(difficulty) {
  return DIFFICULTY_LEVELS[clampDifficulty(difficulty) - 1];
}

export const objectSortingConfig = {
  gameId: GAME_ID,
  cognitiveDomain: COGNITIVE_DOMAINS.SEMANTIC_MEMORY,
  roundsPerSession: 3,
  levels: DIFFICULTY_LEVELS,
  getLevel,
};

export default objectSortingConfig;
