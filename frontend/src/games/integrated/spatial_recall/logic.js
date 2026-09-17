/**
 * Spatial Recall - pure placement, recall-target and scoring logic.
 */
import { createRng, pick, shuffle } from '../shared/rng';
import { buildStandardMetrics, mean, safeRatio } from '../shared/metricsShape';
import { GAME_ID, OBJECT_POOL, getConfig } from './config';

export function cellIndex(row, col, cols) {
  return row * cols + col;
}

export function cellCoords(index, cols) {
  return { row: Math.floor(index / cols), col: index % cols };
}

/** Distance between two cells - useful for "near miss" analysis in metrics. */
export function gridDistance(indexA, indexB, cols) {
  const a = cellCoords(indexA, cols);
  const b = cellCoords(indexB, cols);
  const dRow = Math.abs(a.row - b.row);
  const dCol = Math.abs(a.col - b.col);
  return { manhattan: dRow + dCol, chebyshev: Math.max(dRow, dCol) };
}

/** Choose the object set; `similarObjects` biases towards one family (harder to tell apart). */
export function selectObjects({ count, similarObjects, rng, pool = OBJECT_POOL }) {
  if (!similarObjects) return shuffle(rng, pool).slice(0, count);
  const families = Array.from(new Set(pool.map((o) => o.family)));
  const family = pick(rng, families);
  const sameFamily = shuffle(rng, pool.filter((o) => o.family === family));
  const rest = shuffle(rng, pool.filter((o) => o.family !== family));
  return [...sameFamily, ...rest].slice(0, count);
}

export function placeObjects({ objects, rows, cols, rng }) {
  const cells = shuffle(
    rng,
    Array.from({ length: rows * cols }, (_, i) => i)
  );
  return objects.map((object, i) => ({ ...object, cell: cells[i] }));
}

export function buildRecallQueue({ placements, recallTargets, rng }) {
  return shuffle(rng, placements).slice(0, Math.min(recallTargets, placements.length));
}

export function generateRound({ difficulty, rng = createRng(), roundIndex = 0, pool = OBJECT_POOL } = {}) {
  const config = getConfig(difficulty);
  const objects = selectObjects({ count: config.objectCount, similarObjects: config.similarObjects, rng, pool });
  const placements = placeObjects({ objects, rows: config.rows, cols: config.cols, rng });
  const recallQueue = buildRecallQueue({ placements, recallTargets: config.recallTargets, rng });

  return {
    id: `${GAME_ID}-r${roundIndex}`,
    roundIndex,
    difficulty: config.level,
    rows: config.rows,
    cols: config.cols,
    observationMs: config.observationMs,
    recallDelayMs: config.recallDelayMs,
    hintsAllowed: config.hintsAllowed,
    placements,
    recallQueue,
  };
}

export function validateLocation(round, placement, selectedCell) {
  const correct = placement.cell === selectedCell;
  const distance = gridDistance(placement.cell, selectedCell, round.cols);
  return { correct, distance: distance.manhattan, chebyshev: distance.chebyshev };
}

/** Hint: reveal the correct row (weak cue) rather than the exact cell. */
export function locationHint(round, placement) {
  const { row } = cellCoords(placement.cell, round.cols);
  return { type: 'row', row, key: 'games.spatialRecall.hint.row' };
}

export function summarizeRound({ round, answers, hintsUsed }) {
  const correct = answers.filter((a) => a.correct).length;
  return {
    roundId: round.id,
    asked: answers.length,
    correct,
    incorrect: answers.length - correct,
    hintsUsed,
    distances: answers.filter((a) => !a.correct).map((a) => a.distance),
    responseTimes: answers.map((a) => a.responseTimeMs),
    objectsShown: round.placements.length,
  };
}

export function buildMetrics({ difficulty, rounds, sessionDurationSec, completed, earlyExit = false }) {
  const correct = rounds.reduce((a, r) => a + r.correct, 0);
  const asked = rounds.reduce((a, r) => a + r.asked, 0);
  const distances = rounds.flatMap((r) => r.distances);
  const responseTimes = rounds.flatMap((r) => r.responseTimes);

  return buildStandardMetrics({
    gameId: GAME_ID,
    difficulty,
    accuracy: safeRatio(correct, asked),
    reactionTimeMs: mean(responseTimes),
    errors: asked - correct,
    hintsUsed: rounds.reduce((a, r) => a + r.hintsUsed, 0),
    completed,
    earlyExit,
    sessionDurationSec,
    roundsCompleted: rounds.length,
    meta: {
      correct_locations: correct,
      incorrect_locations: asked - correct,
      avg_miss_distance: Number(mean(distances).toFixed(2)),
      objects_per_round: mean(rounds.map((r) => r.objectsShown)),
      locations_asked: asked,
    },
  });
}
