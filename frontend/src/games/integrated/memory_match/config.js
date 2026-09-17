import { COGNITIVE_DOMAINS } from '../shared/gameTypes.js';
import { clampDifficulty } from '../shared/gameMetrics.js';

export const GAME_ID = 'memory_match';

/**
 * Board size is the main dial, but preview time and item similarity matter
 * just as much. Level 5 stays at 16 cards (8 pairs): beyond that the board
 * stops testing memory and starts testing patience.
 */
export const DIFFICULTY_LEVELS = [
  { level: 1, cardCount: 4, columns: 2, previewMs: 3000, mismatchDelayMs: 1600, useSimilarItems: false, hintsPerRound: 2 },
  { level: 2, cardCount: 6, columns: 3, previewMs: 2800, mismatchDelayMs: 1500, useSimilarItems: false, hintsPerRound: 2 },
  { level: 3, cardCount: 8, columns: 4, previewMs: 2500, mismatchDelayMs: 1400, useSimilarItems: false, hintsPerRound: 1 },
  { level: 4, cardCount: 12, columns: 4, previewMs: 2200, mismatchDelayMs: 1300, useSimilarItems: true, hintsPerRound: 1 },
  { level: 5, cardCount: 16, columns: 4, previewMs: 2000, mismatchDelayMs: 1200, useSimilarItems: true, hintsPerRound: 1 },
];

export function getLevel(difficulty) {
  return DIFFICULTY_LEVELS[clampDifficulty(difficulty) - 1];
}

export const memoryMatchConfig = {
  gameId: GAME_ID,
  cognitiveDomain: COGNITIVE_DOMAINS.VISUAL_MEMORY,
  roundsPerSession: 3,
  levels: DIFFICULTY_LEVELS,
  getLevel,
};

export default memoryMatchConfig;
