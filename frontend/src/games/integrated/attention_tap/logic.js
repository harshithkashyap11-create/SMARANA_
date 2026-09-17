/**
 * Attention Tap - sequence generation and hit/miss/false-positive scoring.
 * Entirely pure: the component only plays the sequence back on a timer.
 */
import { createRng, pick, shuffle } from '../shared/rng';
import { buildStandardMetrics, consistencyScore, mean, safeRatio, standardDeviation } from '../shared/metricsShape';
import { GAME_ID, STIMULUS_THEMES, getConfig } from './config';

const MAX_CONSECUTIVE_TARGETS = 3;

export function buildDistractorPool(theme, similarity) {
  if (similarity === 'near') return theme.nearDistractors;
  if (similarity === 'far') return theme.farDistractors;
  return [...theme.nearDistractors, ...theme.farDistractors];
}

/**
 * Build the stimulus list. Each entry carries its own onset so scoring can
 * compute reaction time relative to stimulus appearance, not round start.
 */
export function generateStimulusSequence({ difficulty, rng = createRng(), theme: forcedTheme, roundIndex = 0 } = {}) {
  const config = getConfig(difficulty);
  const theme = forcedTheme || pick(rng, STIMULUS_THEMES);
  const distractors = buildDistractorPool(theme, config.distractorSimilarity);
  const targetCount = Math.max(3, Math.round(config.stimulusCount * config.targetRatio));

  const flags = shuffle(rng, [
    ...Array.from({ length: targetCount }, () => true),
    ...Array.from({ length: config.stimulusCount - targetCount }, () => false),
  ]);

  // Break up long target runs so the task stays a detection task, not a rhythm.
  for (let i = MAX_CONSECUTIVE_TARGETS; i < flags.length; i += 1) {
    const run = flags.slice(i - MAX_CONSECUTIVE_TARGETS, i + 1);
    if (run.every(Boolean)) {
      const swapIndex = flags.findIndex((f, j) => !f && j > i);
      if (swapIndex > -1) {
        flags[i] = false;
        flags[swapIndex] = true;
      }
    }
  }

  let onset = 0;
  const sequence = flags.map((isTarget, index) => {
    let item;
    let isInhibitor = false;
    if (isTarget) {
      item = pick(rng, theme.targets);
    } else if (config.inhibition && theme.inhibitor && rng() < 0.22) {
      item = theme.inhibitor;
      isInhibitor = true;
    } else {
      item = pick(rng, distractors);
    }
    const entry = {
      id: `${GAME_ID}-${roundIndex}-${index}`,
      index,
      itemId: item.id,
      emoji: item.emoji,
      labelKey: item.labelKey,
      isTarget,
      isInhibitor,
      onsetMs: onset,
      durationMs: config.stimulusMs,
    };
    onset += config.stimulusMs + config.gapMs;
    return entry;
  });

  return {
    id: `${GAME_ID}-r${roundIndex}`,
    roundIndex,
    difficulty: config.level,
    themeId: theme.id,
    targetKey: theme.targetKey,
    targetEmoji: theme.targets[0].emoji,
    inhibition: config.inhibition,
    inhibitionRuleKey: config.inhibition ? theme.inhibitionRuleKey : null,
    inhibitorEmoji: config.inhibition && theme.inhibitor ? theme.inhibitor.emoji : null,
    stimulusMs: config.stimulusMs,
    gapMs: config.gapMs,
    totalDurationMs: onset,
    sequence,
  };
}

/**
 * Score a played round.
 * `taps` = [{ stimulusId, latencyMs }] where latencyMs is measured from the
 * stimulus onset. Taps landing in a gap (stimulusId === null) count as
 * false alarms.
 */
export function scoreSequence(round, taps) {
  const tapByStimulus = new Map();
  let gapTaps = 0;
  taps.forEach((tap) => {
    if (!tap.stimulusId) {
      gapTaps += 1;
      return;
    }
    if (!tapByStimulus.has(tap.stimulusId)) tapByStimulus.set(tap.stimulusId, tap);
  });

  let hits = 0;
  let misses = 0;
  let falseAlarms = gapTaps;
  let inhibitionErrors = 0;
  let correctRejections = 0;
  const reactionTimes = [];

  round.sequence.forEach((stimulus) => {
    const tap = tapByStimulus.get(stimulus.id);
    if (stimulus.isTarget) {
      if (tap) {
        hits += 1;
        reactionTimes.push(tap.latencyMs);
      } else {
        misses += 1;
      }
    } else if (tap) {
      falseAlarms += 1;
      if (stimulus.isInhibitor) inhibitionErrors += 1;
    } else {
      correctRejections += 1;
    }
  });

  const targets = hits + misses;
  return {
    roundId: round.id,
    hits,
    misses,
    falseAlarms,
    inhibitionErrors,
    correctRejections,
    targets,
    reactionTimes,
    meanReactionTimeMs: mean(reactionTimes),
    reactionTimeSd: standardDeviation(reactionTimes),
    consistency: consistencyScore(reactionTimes),
    accuracy: safeRatio(hits + correctRejections, round.sequence.length),
    targetAccuracy: safeRatio(hits, targets),
  };
}

export function buildMetrics({ difficulty, rounds, sessionDurationSec, completed, earlyExit = false }) {
  const hits = rounds.reduce((a, r) => a + r.hits, 0);
  const misses = rounds.reduce((a, r) => a + r.misses, 0);
  const falseAlarms = rounds.reduce((a, r) => a + r.falseAlarms, 0);
  const correctRejections = rounds.reduce((a, r) => a + r.correctRejections, 0);
  const allRts = rounds.flatMap((r) => r.reactionTimes);

  return buildStandardMetrics({
    gameId: GAME_ID,
    difficulty,
    accuracy: safeRatio(hits + correctRejections, hits + misses + falseAlarms + correctRejections),
    reactionTimeMs: mean(allRts),
    errors: misses + falseAlarms,
    hintsUsed: 0,
    completed,
    earlyExit,
    sessionDurationSec,
    roundsCompleted: rounds.length,
    meta: {
      correct_taps: hits,
      missed_targets: misses,
      false_positive_taps: falseAlarms,
      inhibition_errors: rounds.reduce((a, r) => a + r.inhibitionErrors, 0),
      target_accuracy: Number(safeRatio(hits, hits + misses).toFixed(4)),
      reaction_time_sd_ms: Math.round(standardDeviation(allRts)),
      sustained_attention_consistency: Number(consistencyScore(allRts).toFixed(4)),
    },
  });
}
