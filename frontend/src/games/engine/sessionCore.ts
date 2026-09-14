import type { ContentPack } from "../../content/packs";
import type { ResumeState } from "../../db/repo/games";
import { createSeededRng, type Answer, type GameModule } from "./types";

export function buildRoundAtIndex<R>(
  module: GameModule<R>,
  resume: ResumeState,
  content: ContentPack,
): R {
  const rng = createSeededRng(resume.seed);
  let round = module.buildRound(resume.level, rng, content);
  for (let index = 0; index < resume.roundIndex; index += 1) {
    round = module.buildRound(resume.level, rng, content);
  }
  return round;
}

export function recordAnswer<R>(
  module: GameModule<R>,
  round: R,
  resume: ResumeState,
  answer: Answer,
  reactionMs: number,
): ResumeState {
  const score = module.score(round, answer);
  return {
    ...resume,
    roundIndex: resume.roundIndex + 1,
    metrics: {
      ...resume.metrics,
      correct: resume.metrics.correct + (score.correct ? 1 : 0),
      mistakes: resume.metrics.mistakes + (score.correct ? 0 : 1),
      reactionTimes: [...resume.metrics.reactionTimes, reactionMs],
      rawEvents: answer.extra
        ? [...resume.metrics.rawEvents, answer.extra]
        : resume.metrics.rawEvents,
    },
  };
}
