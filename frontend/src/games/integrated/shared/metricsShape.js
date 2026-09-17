/**
 * Canonical metric envelope for games 7-12.
 *
 * The keys match the standard established by games 1-6. If the project already
 * exposes a builder (e.g. shared/metrics.js buildMetrics), map through it -
 * this file only guarantees shape and safe numbers, it does not transport.
 */

export function safeRatio(numerator, denominator) {
  if (!denominator) return 0;
  return Math.max(0, Math.min(1, numerator / denominator));
}

export function mean(values) {
  if (!values || values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function standardDeviation(values) {
  if (!values || values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Coefficient-of-variation based consistency score in [0,1]; 1 = very steady. */
export function consistencyScore(values) {
  const m = mean(values);
  if (!m) return 0;
  return Math.max(0, Math.min(1, 1 - standardDeviation(values) / m));
}

export function buildStandardMetrics({
  gameId,
  difficulty,
  accuracy = 0,
  reactionTimeMs = 0,
  errors = 0,
  hintsUsed = 0,
  completed = false,
  earlyExit = false,
  sessionDurationSec = 0,
  roundsCompleted = 0,
  meta = {},
}) {
  return {
    game_id: gameId,
    difficulty,
    accuracy: Number(accuracy.toFixed(4)),
    reaction_time_ms: Math.round(reactionTimeMs),
    errors,
    hints_used: hintsUsed,
    completed,
    early_exit: earlyExit,
    session_duration_sec: Math.round(sessionDurationSec),
    rounds_completed: roundsCompleted,
    timestamp: new Date().toISOString(),
    meta,
  };
}
