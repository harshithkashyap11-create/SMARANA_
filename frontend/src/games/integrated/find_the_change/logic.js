import { pickOne, sample } from '../shared/random.js';
import { getItems } from '../shared/itemLibrary.js';
import { computeAccuracy } from '../shared/gameMetrics.js';
import { CHANGE_TYPES, getLevel } from './config.js';

/**
 * Builds the two scenes plus the answer key.
 *
 * Answer convention: the patient always chooses from the objects in the FIRST
 * scene, and the answer is the object that did not stay as it was — the one
 * that was removed, the one that was replaced, or the one that moved. A single
 * rule keeps the question askable in one short sentence for every change type.
 */
export function generateScenes(difficulty, rng = Math.random, pool = getItems()) {
  const level = getLevel(difficulty);
  const spareCount = level.changeCount + 1;
  const chosen = sample(pool, Math.min(level.objectCount + spareCount, pool.length), rng);

  const before = chosen.slice(0, level.objectCount);
  const spares = chosen.slice(level.objectCount);
  const targets = sample(before, Math.min(level.changeCount, before.length), rng);
  const targetIds = targets.map((item) => item.id);

  let after = [...before];
  const changes = [];

  const takeReplacement = (target) => {
    if (spares.length === 0) return null;
    const preferredIndex = level.useSimilarDistractors
      ? spares.findIndex((item) => item.similarityGroup === target.similarityGroup)
      : -1;
    const index = preferredIndex >= 0 ? preferredIndex : 0;
    return spares.splice(index, 1)[0];
  };

  targets.forEach((target) => {
    const index = after.findIndex((item) => item.id === target.id);
    if (index < 0) return;

    const available = level.changeTypes.filter((type) => {
      if (type === CHANGE_TYPES.REPLACED) return spares.length > 0;
      if (type === CHANGE_TYPES.MOVED) return after.length >= 2;
      return true;
    });
    const type = pickOne(available, rng) ?? CHANGE_TYPES.REMOVED;

    if (type === CHANGE_TYPES.REPLACED) {
      const replacement = takeReplacement(target);
      if (replacement) {
        after = after.map((item, position) => (position === index ? replacement : item));
        changes.push({ type, itemId: target.id, replacementId: replacement.id });
        return;
      }
    }

    if (type === CHANGE_TYPES.MOVED) {
      const swapCandidates = after
        .map((item, position) => ({ item, position }))
        .filter(({ item }) => item.id !== target.id && !targetIds.includes(item.id));
      const swap = pickOne(swapCandidates, rng);
      if (swap) {
        const reordered = [...after];
        [reordered[index], reordered[swap.position]] = [reordered[swap.position], reordered[index]];
        after = reordered;
        changes.push({
          type,
          itemId: target.id,
          fromIndex: index,
          toIndex: swap.position,
        });
        return;
      }
    }

    after = after.filter((item) => item.id !== target.id);
    changes.push({ type: CHANGE_TYPES.REMOVED, itemId: target.id });
  });

  return {
    level,
    before,
    after,
    changes,
    answerIds: changes.map((change) => change.itemId),
  };
}

export function evaluateSelections(selectedIds, answerIds) {
  const correctIds = selectedIds.filter((id) => answerIds.includes(id));
  const falseSelections = selectedIds.filter((id) => !answerIds.includes(id));
  const missedIds = answerIds.filter((id) => !selectedIds.includes(id));

  return {
    correctIds,
    falseSelections,
    missedIds,
    correct: correctIds.length,
    total: answerIds.length,
    errors: falseSelections.length + missedIds.length,
    accuracy: computeAccuracy(correctIds.length, answerIds.length),
    isPerfect: correctIds.length === answerIds.length && falseSelections.length === 0,
  };
}

/** First unfound change, used by the hint. */
export function nextUnfoundAnswer(answerIds, selectedIds) {
  return answerIds.find((id) => !selectedIds.includes(id)) ?? null;
}
