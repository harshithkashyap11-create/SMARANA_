import { pickOne, sample, shuffle } from '../shared/random.js';
import { getItems } from '../shared/itemLibrary.js';
import { computeAccuracy } from '../shared/gameMetrics.js';
import { CATEGORY_DEFS, SIMILAR_CATEGORY_SETS, getLevel } from './config.js';

/** Spread `total` objects as evenly as possible across `buckets`. */
export function distribute(total, buckets) {
  if (buckets <= 0) return [];
  const base = Math.floor(total / buckets);
  const remainder = total % buckets;
  return Array.from({ length: buckets }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function selectCategories(level, rng = Math.random) {
  let scoring = [];

  if (level.useSimilarCategories) {
    const seed = pickOne(SIMILAR_CATEGORY_SETS, rng) ?? [];
    scoring = CATEGORY_DEFS.filter((category) => seed.includes(category.id));
  }

  const remaining = CATEGORY_DEFS.filter(
    (category) => !scoring.some((chosen) => chosen.id === category.id),
  );
  scoring = [
    ...scoring,
    ...sample(remaining, Math.max(0, level.categoryCount - scoring.length), rng),
  ].slice(0, level.categoryCount);

  const leftovers = CATEGORY_DEFS.filter(
    (category) => !scoring.some((chosen) => chosen.id === category.id),
  );
  const empties = sample(leftovers, level.emptyCategories, rng)
    .map((category) => ({ ...category, isEmpty: true }));

  return shuffle([...scoring.map((c) => ({ ...c, isEmpty: false })), ...empties], rng);
}

export function generateRound(difficulty, rng = Math.random, pool = getItems()) {
  const level = getLevel(difficulty);
  const categories = selectCategories(level, rng);
  const scoringCategories = categories.filter((category) => !category.isEmpty);
  const counts = distribute(level.objectCount, scoringCategories.length);

  const objects = scoringCategories.flatMap((category, index) => sample(
    pool.filter((item) => item.category === category.id),
    counts[index],
    rng,
  ));

  return {
    level,
    categories,
    objects: shuffle(objects, rng),
  };
}

export function isCorrectPlacement(object, categoryId) {
  return Boolean(object) && object.category === categoryId;
}

/**
 * Accuracy is first-attempt accuracy: an object placed correctly only after a
 * wrong try still counts as an error, which is the signal the DDA model needs.
 */
export function summariseSortingRound({
  objectCount,
  firstAttemptCorrect,
  incorrectPlacements,
  durationMs,
}) {
  return {
    correct: firstAttemptCorrect,
    total: objectCount,
    errors: incorrectPlacements,
    accuracy: computeAccuracy(firstAttemptCorrect, objectCount),
    averageTimePerObjectMs: objectCount > 0 ? Math.round(durationMs / objectCount) : 0,
  };
}
