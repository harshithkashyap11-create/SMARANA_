import {
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
  isValidAdjustment,
} from './gameTypes.js';

/** Force any incoming value into the valid 1..5 difficulty band. */
export function clampDifficulty(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return DIFFICULTY_MIN;
  return Math.min(DIFFICULTY_MAX, Math.max(DIFFICULTY_MIN, Math.round(numeric)));
}

/**
 * Apply a DDA adjustment to the current difficulty.
 * Unknown / malformed adjustments are treated as "keep".
 */
export function applyAdjustment(currentDifficulty, adjustment) {
  const safeAdjustment = isValidAdjustment(adjustment) ? adjustment : 0;
  return clampDifficulty(clampDifficulty(currentDifficulty) + safeAdjustment);
}

export function computeAccuracy(correct, total) {
  if (!total || total <= 0) return 0;
  const ratio = correct / total;
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(1, Math.max(0, round(ratio, 4)));
}

export function average(values) {
  const usable = values.filter((v) => Number.isFinite(v));
  if (usable.length === 0) return 0;
  return usable.reduce((acc, v) => acc + v, 0) / usable.length;
}

export function sum(values) {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

export function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/**
 * Normalise whatever a game reports into the shared RoundResult shape.
 * Every game funnels through this so the DDA feature builder sees one schema.
 */
export function createRoundResult({
  round: roundNumber,
  difficulty,
  correct = 0,
  total = 0,
  errors = 0,
  hintsUsed = 0,
  reactionTimeMs = 0,
  accuracy,
  completed = true,
  extra = {},
}) {
  return {
    round: roundNumber,
    difficulty: clampDifficulty(difficulty),
    correct,
    total,
    errors: Math.max(0, Math.round(errors)),
    hintsUsed: Math.max(0, Math.round(hintsUsed)),
    reactionTimeMs: Math.max(0, Math.round(reactionTimeMs)),
    accuracy: Number.isFinite(accuracy)
      ? Math.min(1, Math.max(0, round(accuracy, 4)))
      : computeAccuracy(correct, total),
    completed,
    extra,
  };
}

/**
 * Build the standardised metrics event sent to the DDA service.
 * `difficulty` is the difficulty of the most recent round, not the next one.
 */
export function buildGameMetrics({
  gameId,
  rounds = [],
  difficulty,
  startedAt,
  endedAt = Date.now(),
  completed = false,
  earlyExit = false,
  gameMetadata = {},
}) {
  const lastRound = rounds[rounds.length - 1];
  const effectiveDifficulty = clampDifficulty(
    difficulty ?? lastRound?.difficulty ?? DIFFICULTY_MIN,
  );

  return {
    game_id: gameId,
    difficulty: effectiveDifficulty,
    accuracy: round(average(rounds.map((r) => r.accuracy)), 4),
    reaction_time_ms: Math.round(average(rounds.map((r) => r.reactionTimeMs))),
    errors: sum(rounds.map((r) => r.errors)),
    hints_used: sum(rounds.map((r) => r.hintsUsed)),
    completed,
    early_exit: earlyExit,
    session_duration_sec: Math.max(
      0,
      Math.round(((endedAt ?? Date.now()) - (startedAt ?? Date.now())) / 1000),
    ),
    rounds_completed: rounds.filter((r) => r.completed).length,
    timestamp: new Date(endedAt ?? Date.now()).toISOString(),
    game_metadata: gameMetadata,
  };
}

/** Lightweight running totals for the on-screen ScorePanel. */
export function summariseRounds(rounds = []) {
  const perfect = rounds.filter((r) => r.accuracy >= 1).length;
  return {
    roundsPlayed: rounds.length,
    perfectRounds: perfect,
    correct: sum(rounds.map((r) => r.correct)),
    mistakes: sum(rounds.map((r) => r.errors)),
    hints: sum(rounds.map((r) => r.hintsUsed)),
    accuracy: round(average(rounds.map((r) => r.accuracy)), 4),
  };
}
