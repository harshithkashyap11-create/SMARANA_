/**
 * Deterministic RNG helpers.
 *
 * Every generator in a game's logic.js takes an `rng` argument so tests can
 * pass a seeded function and assert on exact output.
 */

/** mulberry32 — small, fast, good enough for content selection. */
export { createRng } from './rng.js';

export function shuffle(items, rng = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function sample(items, count, rng = Math.random) {
  const size = Math.max(0, Math.min(count, items.length));
  return shuffle(items, rng).slice(0, size);
}

export function pickOne(items, rng = Math.random) {
  if (!items || items.length === 0) return undefined;
  return items[Math.floor(rng() * items.length)];
}
