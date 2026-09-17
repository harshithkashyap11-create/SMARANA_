import type { ComponentType } from "react";
import type { ContentPack } from "../../content/packs";

export interface SeededRng {
  next(): number;
  int(max: number): number;
  shuffle<T>(items: readonly T[]): T[];
}
export function createSeededRng(seed: string): SeededRng {
  let value =
    Array.from(seed).reduce(
      (hash, char) => Math.imul(hash ^ char.charCodeAt(0), 16777619),
      2166136261,
    ) >>> 0;
  const next = (): number => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max) => Math.floor(next() * max),
    shuffle: <T>(items: readonly T[]) => {
      const result = [...items];
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(next() * (index + 1));
        [result[index], result[swap]] = [result[swap] as T, result[index] as T];
      }
      return result;
    },
  };
}
export interface Answer {
  value: unknown;
  extra?: Record<string, unknown>;
}
export interface Score {
  correct: boolean;
  partial?: number;
}
export interface RoundProps<R> {
  round: R;
  onAnswer: (answer: Answer) => void;
  onHint: () => void;
}
export interface GameModule<R = unknown> {
  key: string;
  name: string;
  domains: string[];
  buildRound(level: number, rng: SeededRng, content: ContentPack): R;
  Render: ComponentType<RoundProps<R>>;
  score(round: R, answer: Answer): Score;
  roundsForLevel(level: number): number;
}
