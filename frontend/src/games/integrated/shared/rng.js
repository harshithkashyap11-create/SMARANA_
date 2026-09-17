/**
 * Deterministic RNG helpers shared by games 7-12.
 *
 * Every logic module accepts an `rng` function so round generation is
 * reproducible in unit tests (pass createRng('fixed-seed')).
 * If the project already ships an equivalent util, delete this file and point
 * the logic imports at the existing one. Required surface:
 *   createRng(seed) -> () => float in [0,1)
 *   randomInt / pick / pickMany / shuffle
 */

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createRng(seed = Date.now()) {
  let a = (typeof seed === 'string' ? hashString(seed) : Number(seed)) >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick(rng, list) {
  if (!list || list.length === 0) return undefined;
  return list[Math.floor(rng() * list.length)];
}

export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/** Sample `count` items, preferring no repeats; repeats only if the pool is too small. */
export function pickMany(rng, list, count) {
  if (!list || list.length === 0 || count <= 0) return [];
  const out = [];
  while (out.length < count) {
    const pool = shuffle(rng, list);
    for (let i = 0; i < pool.length && out.length < count; i += 1) out.push(pool[i]);
  }
  return out;
}
