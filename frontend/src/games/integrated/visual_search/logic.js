/**
 * Visual Search - pure game logic. No React, no side effects, fully testable.
 */
import { createRng, pick, pickMany, shuffle, randomInt } from '../shared/rng';
import { buildStandardMetrics, mean, safeRatio } from '../shared/metricsShape';
import { GAME_ID, ITEM_FAMILIES, getConfig } from './config';

const SIMILARITY_MIX = {
  none: 0,
  low: 0.25,
  medium: 0.5,
  high: 1,
};

export function flattenItems(families = ITEM_FAMILIES) {
  return Object.entries(families).flatMap(([family, items]) => items.map((item) => ({ ...item, family })));
}

/**
 * Build the distractor pool for a target according to the similarity setting.
 * Returns a list of item objects (never containing the target itself).
 */
export function buildDistractorPool(target, similarity, families = ITEM_FAMILIES) {
  const all = flattenItems(families);
  const sameFamily = all.filter((i) => i.family === target.family && i.id !== target.id);
  const otherFamily = all.filter((i) => i.family !== target.family);
  if (similarity === 'high') return sameFamily.length ? sameFamily : otherFamily;
  if (similarity === 'none') return otherFamily;
  return { sameFamily, otherFamily };
}

export function generateRound({ difficulty, rng = createRng(), roundIndex = 0, families = ITEM_FAMILIES } = {}) {
  const config = getConfig(difficulty);
  const all = flattenItems(families);
  const target = pick(rng, all);
  const cellCount = config.rows * config.cols;
  const targetCount = Math.min(config.targetCount, Math.max(1, cellCount - 1));
  const distractorCount = cellCount - targetCount;

  let distractors;
  if (config.similarity === 'high' || config.similarity === 'none') {
    distractors = pickMany(rng, buildDistractorPool(target, config.similarity, families), distractorCount);
  } else {
    const { sameFamily, otherFamily } = buildDistractorPool(target, config.similarity, families);
    const similarCount = Math.round(distractorCount * SIMILARITY_MIX[config.similarity]);
    const usableSimilar = sameFamily.length ? sameFamily : otherFamily;
    distractors = shuffle(rng, [
      ...pickMany(rng, usableSimilar, similarCount),
      ...pickMany(rng, otherFamily, distractorCount - similarCount),
    ]);
  }

  const cells = distractors.map((item, index) => ({
    key: `d${index}`,
    itemId: item.id,
    emoji: item.emoji,
    labelKey: item.labelKey,
    isTarget: false,
  }));

  // Insert targets at distinct random positions.
  const positions = [];
  while (positions.length < targetCount) {
    const p = randomInt(rng, 0, cells.length);
    if (!positions.includes(p)) positions.push(p);
  }
  positions
    .sort((a, b) => a - b)
    .forEach((position, i) => {
      cells.splice(position + i, 0, {
        key: `t${i}`,
        itemId: target.id,
        emoji: target.emoji,
        labelKey: target.labelKey,
        isTarget: true,
      });
    });

  return {
    id: `${GAME_ID}-r${roundIndex}`,
    roundIndex,
    difficulty: config.level,
    target,
    targetCount,
    rows: config.rows,
    cols: config.cols,
    responseWindowMs: config.responseWindowMs,
    cells: cells.slice(0, cellCount),
  };
}

export function createRoundState(round) {
  return {
    roundId: round.id,
    targetCount: round.targetCount,
    tapped: [],
    hits: 0,
    falsePositives: 0,
    reactionTimes: [],
    resolved: false,
    hintsUsed: 0,
  };
}

/** Pure reducer: returns a NEW round state after a tap. Repeat taps are ignored. */
export function registerTap(state, round, cellKey, elapsedMs) {
  if (state.resolved || state.tapped.includes(cellKey)) return state;
  const cell = round.cells.find((c) => c.key === cellKey);
  if (!cell) return state;
  const hits = state.hits + (cell.isTarget ? 1 : 0);
  const next = {
    ...state,
    tapped: [...state.tapped, cellKey],
    hits,
    falsePositives: state.falsePositives + (cell.isTarget ? 0 : 1),
    reactionTimes: cell.isTarget ? [...state.reactionTimes, elapsedMs] : state.reactionTimes,
  };
  next.resolved = hits >= state.targetCount;
  return next;
}

export function applyHint(state) {
  return { ...state, hintsUsed: state.hintsUsed + 1 };
}

/** Called when a round ends (found all targets, timed out, or skipped). */
export function summarizeRound(state, { timedOut = false } = {}) {
  const misses = Math.max(0, state.targetCount - state.hits);
  return {
    roundId: state.roundId,
    hits: state.hits,
    misses,
    falsePositives: state.falsePositives,
    hintsUsed: state.hintsUsed,
    timedOut,
    accuracy: safeRatio(state.hits, state.hits + state.falsePositives + misses),
    firstResponseMs: state.reactionTimes.length ? state.reactionTimes[0] : 0,
    searchTimeMs: state.reactionTimes.length ? state.reactionTimes[state.reactionTimes.length - 1] : 0,
  };
}

/** Standard metric envelope for the DDA pipeline. */
export function buildMetrics({ difficulty, rounds, sessionDurationSec, completed, earlyExit = false }) {
  const hits = rounds.reduce((a, r) => a + r.hits, 0);
  const misses = rounds.reduce((a, r) => a + r.misses, 0);
  const falsePositives = rounds.reduce((a, r) => a + r.falsePositives, 0);
  const searchTimes = rounds.map((r) => r.searchTimeMs).filter(Boolean);
  const firstResponses = rounds.map((r) => r.firstResponseMs).filter(Boolean);

  return buildStandardMetrics({
    gameId: GAME_ID,
    difficulty,
    accuracy: safeRatio(hits, hits + misses + falsePositives),
    reactionTimeMs: mean(firstResponses),
    errors: falsePositives + misses,
    hintsUsed: rounds.reduce((a, r) => a + r.hintsUsed, 0),
    completed,
    earlyExit,
    sessionDurationSec,
    roundsCompleted: rounds.length,
    meta: {
      target_selections: hits,
      incorrect_taps: falsePositives,
      missed_targets: misses,
      avg_search_time_ms: Math.round(mean(searchTimes)),
      timed_out_rounds: rounds.filter((r) => r.timedOut).length,
    },
  });
}
