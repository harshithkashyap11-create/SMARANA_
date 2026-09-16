/* eslint-disable react-refresh/only-export-components */
import type { ContentPack } from "../../../content/packs";
import type { Answer, GameModule, RoundProps, SeededRng } from "../../engine/types";

export type PlaceRound = { prompt: string; choices: string[]; answer: string };

export function buildPlaceRound(level: number, rng: SeededRng, content: ContentPack): PlaceRound {
  const places = content.sequenceItems.filter((item) => item.title.length > 0);
  const selected = places[rng.int(places.length)] ?? content.sequenceItems[0]!;
  const choices = rng.shuffle([selected.title, ...places.filter((item) => item.id !== selected.id).slice(0, Math.min(3, level + 1)).map((item) => item.title)]);
  return { prompt: `Which place do you recognise?`, choices, answer: selected.title };
}

function PlaceRoundView({ round, onAnswer, onHint }: RoundProps<PlaceRound>) {
  return <section><p className="mb-4 text-xl font-bold">{round.prompt}</p><div className="grid gap-3">{round.choices.map((choice) => <button className="min-h-touch rounded-card border-2 border-primary p-4 text-left" key={choice} type="button" onClick={() => onAnswer({ value: choice })}>{choice}</button>)}</div><button className="mt-4 min-h-touch rounded-card border-2 border-primary px-5" type="button" onClick={onHint}>💡 Show me</button></section>;
}

export const familiarPlaceRecall: GameModule<PlaceRound> = {
  key: "familiar_place_recall", name: "Familiar Place Recall", domains: ["memory", "recognition"], buildRound: buildPlaceRound,
  Render: PlaceRoundView, score: (round: PlaceRound, answer: Answer) => ({ correct: answer.value === round.answer }), roundsForLevel: () => 5,
};
