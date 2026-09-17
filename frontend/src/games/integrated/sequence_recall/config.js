import { COGNITIVE_DOMAINS } from '../shared/gameTypes.js';
import { clampDifficulty } from '../shared/gameMetrics.js';

export const GAME_ID = 'sequence_recall';

/**
 * Five levels. Each one moves several cognitive-load dials at once:
 * span (sequenceLength), encoding time (displayTimeMs), retention interval
 * (recallDelayMs) and recognition interference (distractors).
 */
export const DIFFICULTY_LEVELS = [
  { level: 1, sequenceLength: 3, displayTimeMs: 1800, gapMs: 450, recallDelayMs: 0, distractors: 0, hintsPerRound: 2 },
  { level: 2, sequenceLength: 4, displayTimeMs: 1600, gapMs: 400, recallDelayMs: 500, distractors: 0, hintsPerRound: 2 },
  { level: 3, sequenceLength: 5, displayTimeMs: 1400, gapMs: 350, recallDelayMs: 1000, distractors: 1, hintsPerRound: 1 },
  { level: 4, sequenceLength: 6, displayTimeMs: 1200, gapMs: 320, recallDelayMs: 1500, distractors: 2, hintsPerRound: 1 },
  { level: 5, sequenceLength: 7, displayTimeMs: 1000, gapMs: 300, recallDelayMs: 2000, distractors: 2, hintsPerRound: 1 },
];

export function getLevel(difficulty) {
  return DIFFICULTY_LEVELS[clampDifficulty(difficulty) - 1];
}

export const sequenceRecallConfig = {
  gameId: GAME_ID,
  cognitiveDomain: COGNITIVE_DOMAINS.WORKING_MEMORY,
  roundsPerSession: 5,
  levels: DIFFICULTY_LEVELS,
  getLevel,
};

export default sequenceRecallConfig;
