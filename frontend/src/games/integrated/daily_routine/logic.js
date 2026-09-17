import { pickOne, sample, shuffle } from '../shared/random.js';
import { computeAccuracy } from '../shared/gameMetrics.js';
import { SCENARIOS, getLevel } from './config.js';

export function buildRound(difficulty, rng = Math.random, scenarios = SCENARIOS) {
  const level = getLevel(difficulty);
  const usable = scenarios.filter((scenario) => scenario.steps.length >= level.stepCount);
  const scenario = pickOne(usable.length > 0 ? usable : scenarios, rng);

  const steps = scenario.steps.slice(0, level.stepCount);
  const distractors = sample(scenario.distractors ?? [], level.distractors, rng)
    .map((step) => ({ ...step, isDistractor: true }));

  const slots = steps.map(() => null);
  const prePlacedCount = Math.min(level.prePlaced, steps.length);
  for (let index = 0; index < prePlacedCount; index += 1) {
    slots[index] = steps[index].id;
  }

  const placedIds = slots.filter(Boolean);
  const tray = shuffle(
    [...steps, ...distractors].filter((step) => !placedIds.includes(step.id)),
    rng,
  );

  return {
    level,
    scenario,
    steps,
    distractors,
    correctOrder: steps.map((step) => step.id),
    slots,
    tray,
    prePlacedCount,
  };
}

export function findStep(round, stepId) {
  return [...round.steps, ...round.distractors].find((step) => step.id === stepId) ?? null;
}

export function evaluateOrder(placedIds, correctOrder) {
  let correctPositions = 0;
  for (let index = 0; index < correctOrder.length; index += 1) {
    if (placedIds[index] && placedIds[index] === correctOrder[index]) correctPositions += 1;
  }

  const distractorsPlaced = placedIds
    .filter((id) => id && !correctOrder.includes(id)).length;

  return {
    correctPositions,
    misplaced: correctOrder.length - correctPositions,
    distractorsPlaced,
    total: correctOrder.length,
    accuracy: computeAccuracy(correctPositions, correctOrder.length),
    isPerfect: correctPositions === correctOrder.length,
  };
}

/** First slot that does not yet hold the right step — drives the hint. */
export function nextExpectedStep(slots, correctOrder) {
  for (let index = 0; index < correctOrder.length; index += 1) {
    if (slots[index] !== correctOrder[index]) {
      return { index, stepId: correctOrder[index] };
    }
  }
  return null;
}

export function moveWithinSlots(slots, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= slots.length) return slots;
  const next = [...slots];
  [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
  return next;
}
