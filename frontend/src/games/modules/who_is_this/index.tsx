/* eslint-disable react-refresh/only-export-components */
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { RoundProps } from "../../engine/types";
import { ChoiceView, type ChoiceRound } from "../new_games";
import { definition, choose } from "../new_games";
const module = definition(
  "who_is_this",
  "Who Is This?",
  ["recognition"],
  (level, rng, content) => {
    const family = (content.family ?? []).filter((item) => item.imageUrl);
    if (!family.length) throw new Error("Family photos required");
    const choices = choose(family, level, rng);
    const selected = choices[rng.int(choices.length)]!;
    const relationship = level >= 5;
    const options = relationship
      ? [...new Set(choices.map((item) => item.relationship))].map((title) => ({
          id: title,
          title,
          imageUrl: "",
        }))
      : choices.map((item) => ({ ...item, imageUrl: "" }));
    return {
      prompt: relationship ? "newGames.relationship" : "newGames.person",
      choices: options,
      expected: [relationship ? selected.relationship : selected.id],
      image: selected.imageUrl,
    };
  },
);

function FamilyViewInner(props: RoundProps<ChoiceRound>) {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <>
      <ChoiceView
        {...props}
        onAnswer={(answer) => {
          const label =
            props.round.choices.find(
              (item) => item.id === props.round.expected[0],
            )?.title ?? "";
          setFeedback(
            t(
              module.score(props.round, answer).correct
                ? "quiz.correct"
                : "quiz.saved_as",
              { label },
            ),
          );
          timer.current = setTimeout(() => props.onAnswer(answer), 1200);
        }}
      />
      {feedback && (
        <p role="status" className="rounded-card bg-success/20 p-4 text-2xl">
          {feedback}
        </p>
      )}
    </>
  );
}
function FamilyView(props: RoundProps<ChoiceRound>) {
  return <FamilyViewInner key={JSON.stringify(props.round)} {...props} />;
}
export const whoIsThis = { ...module, Render: FamilyView };
