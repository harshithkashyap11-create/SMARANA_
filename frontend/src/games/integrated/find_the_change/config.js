import { COGNITIVE_DOMAINS } from '../shared/gameTypes.js';
import { clampDifficulty } from '../shared/gameMetrics.js';

export const GAME_ID = 'find_the_change';

export const CHANGE_TYPES = {
  REMOVED: 'removed',
  REPLACED: 'replaced',
  MOVED: 'moved',
};

/**
 * Levels 1-2 only remove or replace an object, which is the easiest change to
 * notice. "Moved" appears from level 3, and only there does the game start
 * asking for position memory rather than presence memory.
 */
export const DIFFICULTY_LEVELS = [
  {
    level: 1, objectCount: 4, observeMs: 5000, delayMs: 800, changeCount: 1,
    changeTypes: [CHANGE_TYPES.REMOVED], useSimilarDistractors: false, hintsPerRound: 2,
  },
  {
    level: 2, objectCount: 5, observeMs: 4500, delayMs: 1000, changeCount: 1,
    changeTypes: [CHANGE_TYPES.REMOVED, CHANGE_TYPES.REPLACED], useSimilarDistractors: false, hintsPerRound: 2,
  },
  {
    level: 3, objectCount: 6, observeMs: 4000, delayMs: 1200, changeCount: 1,
    changeTypes: [CHANGE_TYPES.REMOVED, CHANGE_TYPES.REPLACED, CHANGE_TYPES.MOVED], useSimilarDistractors: false, hintsPerRound: 1,
  },
  {
    level: 4, objectCount: 8, observeMs: 3500, delayMs: 1500, changeCount: 2,
    changeTypes: [CHANGE_TYPES.REMOVED, CHANGE_TYPES.REPLACED, CHANGE_TYPES.MOVED], useSimilarDistractors: true, hintsPerRound: 1,
  },
  {
    level: 5, objectCount: 9, observeMs: 3000, delayMs: 2000, changeCount: 2,
    changeTypes: [CHANGE_TYPES.REMOVED, CHANGE_TYPES.REPLACED, CHANGE_TYPES.MOVED], useSimilarDistractors: true, hintsPerRound: 1,
  },
];

export function getLevel(difficulty) {
  return DIFFICULTY_LEVELS[clampDifficulty(difficulty) - 1];
}

export const findTheChangeConfig = {
  gameId: GAME_ID,
  cognitiveDomain: COGNITIVE_DOMAINS.VISUAL_ATTENTION,
  roundsPerSession: 4,
  levels: DIFFICULTY_LEVELS,
  getLevel,
};

export default findTheChangeConfig;
