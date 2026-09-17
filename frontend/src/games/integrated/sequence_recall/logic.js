import { sample, shuffle } from '../shared/random.js';
import { getItems } from '../shared/itemLibrary.js';
import { computeAccuracy } from '../shared/gameMetrics.js';
import { getLevel } from './config.js';

/**
 * Builds one round: the sequence to memorise plus the tap options shown
 * afterwards (sequence items + distractors, shuffled).
 */
export function generateRound(difficulty, rng = Math.random, pool = getItems()) {
  const level = getLevel(difficulty);
  const needed = level.sequenceLength + level.distractors;
  const chosen = sample(pool, Math.min(needed, pool.length), rng);
  const sequence = chosen.slice(0, Math.min(level.sequenceLength, chosen.length));

  return {
    level,
    sequence,
    options: shuffle(chosen, rng),
  };
}

const toId = (value) => (typeof value === 'string' ? value : value?.id);

/**
 * Position-by-position scoring. Extra taps beyond the sequence length count as
 * errors so a patient tapping everything does not score highly.
 */
export function evaluateSequence(sequence, answer) {
  const expected = sequence.map(toId);
  const given = answer.map(toId);

  let correctPositions = 0;
  for (let i = 0; i < expected.length; i += 1) {
    if (given[i] && given[i] === expected[i]) correctPositions += 1;
  }

  const extraTaps = Math.max(0, given.length - expected.length);
  const errors = expected.length - correctPositions + extraTaps;

  return {
    correctPositions,
    sequenceLength: expected.length,
    errors,
    accuracy: computeAccuracy(correctPositions, expected.length),
    isPerfect: correctPositions === expected.length && given.length === expected.length,
  };
}

/** The item the patient should tap next — used by the hint. */
export function nextExpectedItem(sequence, answer) {
  return sequence[answer.length];
}
