import { pickOne, sample, shuffle } from '../shared/random.js';
import { getItems, getSimilarityGroups } from '../shared/itemLibrary.js';
import { computeAccuracy } from '../shared/gameMetrics.js';
import { getLevel } from './config.js';

/**
 * Choose the items that will become pairs. At higher levels we seed the board
 * from one similarity group (all fruit, all hand tools) so the patient has to
 * rely on location memory rather than a quick visual difference.
 */
export function selectPairItems(pairCount, rng = Math.random, pool = getItems(), useSimilarItems = false) {
  if (!useSimilarItems) return sample(pool, pairCount, rng);

  const groups = getSimilarityGroups(2, pool);
  const seedGroup = pickOne(groups, rng);
  const fromGroup = seedGroup
    ? sample(seedGroup.items, Math.min(pairCount, seedGroup.items.length), rng)
    : [];
  const chosenIds = fromGroup.map((item) => item.id);
  const remainder = sample(
    pool.filter((item) => !chosenIds.includes(item.id)),
    pairCount - fromGroup.length,
    rng,
  );
  return [...fromGroup, ...remainder];
}

export function buildDeck(difficulty, rng = Math.random, pool = getItems()) {
  const level = getLevel(difficulty);
  const pairCount = Math.floor(level.cardCount / 2);
  const items = selectPairItems(pairCount, rng, pool, level.useSimilarItems);

  const cards = items.flatMap((item) => ['a', 'b'].map((copy) => ({
    cardId: `${item.id}_${copy}`,
    itemId: item.id,
    emoji: item.emoji,
    labelKey: item.labelKey,
  })));

  return { level, pairCount, cards: shuffle(cards, rng) };
}

export function isMatch(first, second) {
  if (!first || !second) return false;
  return first.cardId !== second.cardId && first.itemId === second.itemId;
}

/** Cards still in play, used by the hint. */
export function findHintPair(cards, matchedItemIds) {
  const unmatched = cards.filter((card) => !matchedItemIds.includes(card.itemId));
  const target = unmatched[0];
  if (!target) return [];
  return unmatched
    .filter((card) => card.itemId === target.itemId)
    .map((card) => card.cardId);
}

/**
 * A perfect round is one move per pair. Accuracy degrades as extra moves are
 * needed, which is what the DDA model consumes.
 */
export function summariseMatchRound({
  pairCount,
  moves,
  mismatches,
  durationMs,
}) {
  return {
    accuracy: computeAccuracy(pairCount, Math.max(moves, pairCount)),
    averageDecisionMs: moves > 0 ? Math.round(durationMs / moves) : 0,
    errors: mismatches,
    moves,
    pairCount,
  };
}
