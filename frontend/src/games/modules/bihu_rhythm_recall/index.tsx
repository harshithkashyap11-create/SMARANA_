/* eslint-disable react-refresh/only-export-components */
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import type { ContentPack } from "../../../content/packs";
import type {
  Answer,
  GameModule,
  RoundProps,
  SeededRng,
} from "../../engine/types";
export interface RhythmAudio {
  play(note: string, durationMs: number): void;
}
export const browserRhythmAudio: RhythmAudio = {
  play(note, durationMs) {
    if (!("AudioContext" in window)) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    oscillator.frequency.value = 220 * 2 ** ((note.charCodeAt(0) - 65) / 12);
    oscillator.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + durationMs / 1000);
  },
};
export interface RhythmRound {
  pattern: string[];
  pulseMs: number;
  toleranceMs: number;
  visual: boolean;
}
export const patternLengthFor = (level: number) =>
  Math.min(8, 3 + Math.floor(((level - 1) * 5) / 9));
export function buildRhythmRound(
  level: number,
  rng: SeededRng,
  content: ContentPack,
): RhythmRound {
  const notes = (content.tunes[0]?.note ?? "C,D,E,G").split(",");
  return {
    pattern: Array.from(
      { length: patternLengthFor(level) },
      () => notes[rng.int(notes.length)]!,
    ),
    pulseMs: Math.max(350, 700 - level * 30),
    toleranceMs: Math.max(180, 500 - level * 30),
    visual: level < 7,
  };
}
export function BihuRhythmRound({
  round,
  onAnswer,
  onHint,
  audio = browserRhythmAudio,
}: RoundProps<RhythmRound> & { audio?: RhythmAudio }) {
  const { t } = useTranslation();
  const [playing, setPlaying] = useState(true);
  const [position, setPosition] = useState(0);
  const [taps, setTaps] = useState<number[]>([]);
  useEffect(() => {
    if (!playing) return;
    audio.play(round.pattern[position]!, round.pulseMs / 2);
    const timer = window.setTimeout(
      () =>
        position + 1 >= round.pattern.length
          ? setPlaying(false)
          : setPosition((old) => old + 1),
      round.pulseMs,
    );
    return () => window.clearTimeout(timer);
  }, [audio, playing, position, round.pattern, round.pulseMs]);
  const tap = () => {
    const next = [...taps, Date.now()];
    setTaps(next);
    audio.play("C", 100);
    if (next.length === round.pattern.length) {
      const intervals = next.slice(1).map((time, i) => time - next[i]!);
      onAnswer({
        value: intervals.every(
          (interval) => Math.abs(interval - round.pulseMs) <= round.toleranceMs,
        ),
        extra: { intervals },
      });
    }
  };
  return (
    <section>
      <div
        aria-live="polite"
        className="mb-5 flex min-h-24 items-center justify-center rounded-card bg-success/20 text-4xl"
      >
        {playing && round.visual
          ? "●"
          : playing
            ? t("gameInstructions.listen")
            : t("gameInstructions.yourTurn")}
      </div>
      <button
        disabled={playing}
        className="min-h-touch w-full rounded-card bg-primary p-5 text-2xl text-primary-text"
        type="button"
        onClick={tap}
      >
        {t("gameInstructions.tapRhythm")}
      </button>
      <button
        className="mt-4 min-h-touch rounded-card border-2 border-primary px-5"
        type="button"
        onClick={() => {
          onHint();
          setPosition(0);
          setPlaying(true);
        }}
      >
        {t("gameInstructions.showMe")}
      </button>
    </section>
  );
}
export const bihuRhythmRecall: GameModule<RhythmRound> = {
  key: "bihu_rhythm_recall",
  name: "Bihu Rhythm Recall",
  domains: ["memory", "sequencing"],
  roundsForLevel: (level) => 4 + Math.floor(level / 2),
  buildRound: buildRhythmRound,
  Render: BihuRhythmRound,
  score: (_round, answer: Answer) => ({ correct: answer.value === true }),
};
