/**
 * Personal Memory Recall - difficulty configuration.
 *
 * Difficulty here means HOW MUCH SUPPORT is offered, not how punishing the game
 * is. Level 1 = maximum support; level 5 = recall-focused with minimal cues.
 * Moving DOWN a level is always a valid, non-punitive response to difficulty.
 */
export const GAME_ID = 'personal_memory';
export const MIN_DIFFICULTY = 1;
export const MAX_DIFFICULTY = 5;

export const MODES = {
  PERSON_RECOGNITION: 'person_recognition',
  RELATIONSHIP_RECALL: 'relationship_recall',
  PLACE_RECOGNITION: 'place_recognition',
  CUED_RECALL: 'cued_recall',
};

export const DIFFICULTY_LEVELS = {
  1: {
    modes: [MODES.PERSON_RECOGNITION, MODES.PLACE_RECOGNITION],
    choiceCount: 2,
    hintsAvailable: 3,
    autoHintAfterMs: 12000,
    showContext: true,
    showRelationshipOnCard: true,
    recallDelayMs: 0,
    roundsPerSession: 5,
    reportEveryRounds: 1,
  },
  2: {
    modes: [MODES.PERSON_RECOGNITION, MODES.PLACE_RECOGNITION],
    choiceCount: 3,
    hintsAvailable: 3,
    autoHintAfterMs: 15000,
    showContext: true,
    showRelationshipOnCard: false,
    recallDelayMs: 0,
    roundsPerSession: 5,
    reportEveryRounds: 1,
  },
  3: {
    modes: [MODES.PERSON_RECOGNITION, MODES.RELATIONSHIP_RECALL, MODES.PLACE_RECOGNITION],
    choiceCount: 3,
    hintsAvailable: 2,
    autoHintAfterMs: 20000,
    showContext: true,
    showRelationshipOnCard: false,
    recallDelayMs: 600,
    roundsPerSession: 6,
    reportEveryRounds: 1,
  },
  4: {
    modes: [MODES.RELATIONSHIP_RECALL, MODES.CUED_RECALL, MODES.PLACE_RECOGNITION],
    choiceCount: 4,
    hintsAvailable: 2,
    autoHintAfterMs: 25000,
    showContext: false,
    showRelationshipOnCard: false,
    recallDelayMs: 1200,
    roundsPerSession: 6,
    reportEveryRounds: 1,
  },
  5: {
    modes: [MODES.CUED_RECALL, MODES.RELATIONSHIP_RECALL],
    choiceCount: 4,
    hintsAvailable: 2,
    autoHintAfterMs: 30000,
    showContext: false,
    showRelationshipOnCard: false,
    recallDelayMs: 1800,
    roundsPerSession: 6,
    reportEveryRounds: 1,
  },
};

/** Two consecutive misses on any item moves the game towards more support. */
export const CONSECUTIVE_MISSES_BEFORE_MORE_SUPPORT = 2;

export function getConfig(level) {
  const clamped = Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, Math.round(Number(level)) || MIN_DIFFICULTY));
  return { ...DIFFICULTY_LEVELS[clamped], level: clamped };
}
