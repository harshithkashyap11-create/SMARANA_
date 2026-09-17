/**
 * Shared contracts for every SMARANA cognitive game.
 *
 * Plain JS + JSDoc so the same shapes can be lifted into TypeScript later
 * without changing any runtime behaviour.
 */

export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 5;

/** Cognitive domains used for grouping games and for DDA profiles. */
export const COGNITIVE_DOMAINS = {
  WORKING_MEMORY: 'working_memory',
  VISUAL_MEMORY: 'visual_memory',
  VISUAL_ATTENTION: 'visual_attention',
  SEMANTIC_MEMORY: 'semantic_memory',
  EXECUTIVE_FUNCTION: 'executive_function',
  VERBAL_MEMORY: 'verbal_memory',
};

/** The only three values the DDA service is allowed to return. */
export const DDA_ADJUSTMENT = {
  DECREASE: -1,
  KEEP: 0,
  INCREASE: 1,
};

/** Lifecycle states a game screen can be in. */
export const GAME_PHASE = {
  READY: 'ready',
  PRESENTING: 'presenting',
  DELAY: 'delay',
  RESPONDING: 'responding',
  FEEDBACK: 'feedback',
  FINISHED: 'finished',
};

/** Tone used by feedback messages. SMARANA never uses a "failure" tone. */
export const FEEDBACK_TONE = {
  SUCCESS: 'success',
  GENTLE: 'gentle',
  INFO: 'info',
};

export function isValidAdjustment(value) {
  return value === DDA_ADJUSTMENT.DECREASE
    || value === DDA_ADJUSTMENT.KEEP
    || value === DDA_ADJUSTMENT.INCREASE;
}

/**
 * @typedef {Object} RoundResult
 * @property {number} round          1-based round number
 * @property {number} difficulty     difficulty the round was played at (1..5)
 * @property {number} accuracy       0..1
 * @property {number} correct        correct units in this round
 * @property {number} total          total scorable units in this round
 * @property {number} errors         incorrect actions in this round
 * @property {number} hintsUsed
 * @property {number} reactionTimeMs time from "response allowed" to completion
 * @property {boolean} completed     round was played to the end
 * @property {Object} [extra]        game specific metadata
 */

/**
 * @typedef {Object} GameMetrics
 * @property {string} game_id
 * @property {number} difficulty
 * @property {number} accuracy
 * @property {number} reaction_time_ms
 * @property {number} errors
 * @property {number} hints_used
 * @property {boolean} completed
 * @property {boolean} early_exit
 * @property {number} session_duration_sec
 * @property {number} rounds_completed
 * @property {string} timestamp
 * @property {Object} [game_metadata]
 */

/**
 * @typedef {Object} DDAResponse
 * @property {-1|0|1} adjustment
 * @property {'server'|'fallback'} source
 * @property {string} [reason]
 */
