import { PrivateImage } from "../../../shared/ui/PrivateImage";
/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ContentItem, ContentPack } from "../../../content/packs";
import type { GameModule, RoundProps, SeededRng } from "../../engine/types";
export interface ChoiceRound {
  prompt: string;
  promptText?: string;
  choices: ContentItem[];
  expected: string[];
  image?: string;
  audio?: string[];
  preview?: string[];
  delay?: number;
  previewMs?: number;
  secondImage?: string;
}
function ChoiceViewInner({ round, onAnswer, onHint }: RoundProps<ChoiceRound>) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState(Boolean(round.preview));
  const [waiting, setWaiting] = useState(Boolean(round.preview));
  const [picked, setPicked] = useState<string[]>([]);
  const [replayCount, setReplayCount] = useState(0);
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (round.preview) {
      const timer = setTimeout(() => setPreview(false), round.previewMs);
      const recall = setTimeout(
        () => setWaiting(false),
        (round.previewMs ?? 0) + (round.delay ?? 0),
      );
      return () => {
        clearTimeout(timer);
        clearTimeout(recall);
      };
    }
  }, [round]);
  useEffect(() => {
    if (!round.audio) return;
    const clips = round.audio.map((url) => new Audio(url));
    let active = true;
    const play = async () => {
      for (const clip of clips) {
        if (!active) return;
        await new Promise<void>((resolve) => {
          clip.onended = () => resolve();
          clip.onerror = () => resolve();
          void clip.play().catch(() => resolve());
        });
      }
    };
    void play();
    return () => {
      active = false;
      clips.forEach((clip) => clip.pause());
    };
  }, [round, replayCount]);
  const replay = () => {
    onHint();
    if (round.audio) setReplayCount((count) => count + 1);
    else setHint(true);
  };
  return (
    <section className="space-y-4">
      <p className="text-2xl font-bold">
        {t(round.prompt)} {!waiting && round.promptText}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {[round.image, round.secondImage].filter(Boolean).map((url, index) => (
          <PrivateImage
            key={index}
            src={url}
            alt={t("newGames.scene")}
            className="h-56 w-full object-contain"
          />
        ))}
      </div>
      {preview ? (
        <div className="text-3xl">
          {round.preview?.map((text, index) => (
            <p key={index}>{text}</p>
          ))}
        </div>
      ) : waiting ? (
        <p className="text-2xl">{t("newGames.remember")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {round.choices.map((choice) => (
            <button
              type="button"
              key={choice.id}
              className={`min-h-touch rounded-card border-2 p-4 text-2xl ${hint && round.expected.includes(choice.id) ? "bg-success/20" : "border-primary"}`}
              disabled={
                picked.includes(choice.id) ||
                picked.length === round.expected.length
              }
              onClick={() => {
                const values = [...picked, choice.id];
                setPicked(values);
                if (values.length === round.expected.length)
                  onAnswer({ value: values });
              }}
            >
              {choice.imageUrl && (
                <PrivateImage
                  src={choice.imageUrl}
                  alt={choice.title}
                  className="h-32 w-full object-contain"
                />
              )}
              {choice.title}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="min-h-touch rounded-card border-2 border-primary p-4"
        onClick={replay}
      >
        {t(round.audio ? "newGames.replaySound" : "newGames.showMe")}
      </button>
    </section>
  );
}
export function ChoiceView(props: RoundProps<ChoiceRound>) {
  return <ChoiceViewInner key={JSON.stringify(props.round)} {...props} />;
}
export const roundsForLevel = (level: number) => 4 + Math.floor(level / 2);
export function definition(
  key: string,
  name: string,
  domains: string[],
  buildRound: (
    level: number,
    rng: SeededRng,
    content: ContentPack,
  ) => ChoiceRound,
): GameModule<ChoiceRound> {
  return {
    key,
    name,
    domains,
    buildRound,
    Render: ChoiceView,
    score: (round, answer) => ({
      correct:
        Array.isArray(answer.value) &&
        answer.value.length === round.expected.length &&
        new Set(answer.value).size === answer.value.length &&
        (answer.value as unknown[]).every((id, index) =>
          round.audio
            ? id === round.expected[index]
            : typeof id === "string" && round.expected.includes(id),
        ),
    }),
    roundsForLevel,
  };
}
export function choose<T extends ContentItem>(
  items: T[],
  level: number,
  rng: SeededRng,
) {
  return rng
    .shuffle(items)
    .slice(0, Math.min(4, 2 + Math.floor((level - 1) / 3)));
}
