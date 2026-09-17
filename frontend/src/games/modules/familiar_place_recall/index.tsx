import { PrivateImage } from "../../../shared/ui/PrivateImage";
import { useTranslation } from "react-i18next";
/* eslint-disable react-refresh/only-export-components */
import type { ContentPack } from "../../../content/packs";
import { defaultPack } from "../../../content/packs";
import type {
  Answer,
  GameModule,
  RoundProps,
  SeededRng,
} from "../../engine/types";

export type PlaceRound = {
  prompt: string;
  choices: string[];
  answer: string;
  imageUrl?: string;
};

export function buildPlaceRound(
  level: number,
  rng: SeededRng,
  content: ContentPack,
): PlaceRound {
  const seen = new Set<string>();
  const supplied = (content.places ?? []).filter((item) => {
    if (!item.title.length || seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });
  const places = supplied.length ? supplied : defaultPack.places!;
  const selected = places[rng.int(places.length)]!;
  const choices = rng.shuffle([
    selected.title,
    ...places
      .filter((item) => item.title !== selected.title)
      .slice(0, Math.min(3, level + 1))
      .map((item) => item.title),
  ]);
  return {
    prompt: selected.imageUrl
      ? "Which place do you recognise?"
      : `Find ${selected.title}.`,
    imageUrl: selected.imageUrl,
    choices,
    answer: selected.title,
  };
}

function PlaceRoundView({ round, onAnswer, onHint }: RoundProps<PlaceRound>) {
  const { t } = useTranslation();
  return (
    <section>
      {round.imageUrl ? (
        <PrivateImage
          alt={t("newGames.scene")}
          src={round.imageUrl}
          className="mb-4 h-56 w-full rounded-card object-contain"
        />
      ) : null}
      <p className="mb-4 text-xl font-bold">
        {t(
          round.imageUrl
            ? "gameInstructions.place"
            : "gameInstructions.findPlace",
          { place: round.answer },
        )}
      </p>
      <div className="grid gap-3">
        {round.choices.map((choice) => (
          <button
            className="min-h-touch rounded-card border-2 border-primary p-4 text-left"
            key={choice}
            type="button"
            onClick={() => onAnswer({ value: choice })}
          >
            {choice}
          </button>
        ))}
      </div>
      <button
        className="mt-4 min-h-touch rounded-card border-2 border-primary px-5"
        type="button"
        onClick={onHint}
      >
        {t("gameInstructions.showMe")}
      </button>
    </section>
  );
}

export const familiarPlaceRecall: GameModule<PlaceRound> = {
  key: "familiar_place_recall",
  name: "Familiar Place Recall",
  domains: ["memory", "recognition"],
  buildRound: buildPlaceRound,
  Render: PlaceRoundView,
  score: (round: PlaceRound, answer: Answer) => ({
    correct: answer.value === round.answer,
  }),
  roundsForLevel: () => 5,
};
