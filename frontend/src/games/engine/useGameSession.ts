import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContentPack } from "../../content/packs";
import {
  clearResume,
  getDifficulty,
  loadResume,
  persistLocalResult,
  saveResume,
  type GameDefinitionDto,
  type ResumeState,
} from "../../db/repo/games";
import type { CachedGameSession } from "../../db/schema";
import { nextDifficulty, sessionLevel, type DifficultyStateData } from "../dda";
import { type Answer, type GameModule } from "./types";
import { buildRoundAtIndex, recordAnswer } from "./sessionCore";
import { detectFatigue } from "./fatigue";

export interface GameSessionController<R> {
  ready: boolean;
  round: R | null;
  roundIndex: number;
  totalRounds: number;
  messageKey: string | null;
  breakOpen: boolean;
  answer(answer: Answer): void;
  hint(): void;
  acceptBreak(): void;
  continuePlaying(): void;
  restart(): void;
}
const newMetrics = (): ResumeState["metrics"] => ({
  correct: 0,
  mistakes: 0,
  hintsUsed: 0,
  reactionTimes: [],
  answers: [],
  rawEvents: [],
});

export function useGameSession<R>(
  module: GameModule<R>,
  game: GameDefinitionDto,
  patientId: string,
  content: ContentPack,
  challengeMode: boolean,
  sessionCapMinutes = 20,
): GameSessionController<R> {
  const [resume, setResumeState] = useState<ResumeState | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyStateData | null>(
    null,
  );
  const [messageKey, setMessageKey] = useState<string | null>(null);
  const [breakOpen, setBreakOpen] = useState(false);
  const roundStarted = useRef(0);
  const start = useCallback(async () => {
    const storedDifficulty = await getDifficulty(patientId, game);
    const override = new URLSearchParams(window.location.search).get("level");
    const level = override
      ? Math.min(game.max_level, Math.max(game.min_level, Number(override)))
      : sessionLevel(storedDifficulty, challengeMode);
    const existing = await loadResume(patientId, module.key);
    const value = existing ?? {
      gameKey: module.key,
      patientId,
      seed: crypto.randomUUID(),
      level,
      roundIndex: 0,
      startedAt: new Date().toISOString(),
      metrics: newMetrics(),
    };
    setDifficulty(storedDifficulty);
    setResumeState(value);
    roundStarted.current = Date.now();
    await saveResume(value);
  }, [challengeMode, game, module.key, patientId]);
  // The async repository read is the external subscription that initializes this session.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void start();
  }, [start]);
  const round = useMemo(() => {
    if (!resume) return null;
    return buildRoundAtIndex(module, resume, content);
  }, [content, module, resume]);
  const finish = useCallback(
    async (
      finalResume: ResumeState,
      completed = true,
      abandonedReason: "break_prompt" | null = null,
    ) => {
      if (!difficulty) return;
      const endedAt = new Date();
      const times = finalResume.metrics.reactionTimes;
      const summary = {
        level: finalResume.level,
        accuracy:
          finalResume.metrics.correct / Math.max(finalResume.roundIndex, 1),
        meanReactionMs:
          times.reduce((a, b) => a + b, 0) / Math.max(times.length, 1),
        mistakes: finalResume.metrics.mistakes,
        hintsUsed: finalResume.metrics.hintsUsed,
        rounds: finalResume.roundIndex,
        completed,
        challengeMode,
        guestMode: false,
        fatigueFlagged: Boolean(finalResume.fatigueFlags?.length),
      };
      const local = nextDifficulty(difficulty, summary);
      const session: CachedGameSession = {
        id: crypto.randomUUID(),
        patientId,
        gameKey: module.key,
        seed: finalResume.seed,
        level: finalResume.level,
        challengeMode,
        startedAt: finalResume.startedAt,
        endedAt: endedAt.toISOString(),
        synced: false,
        metrics: {
          accuracy: summary.accuracy,
          mean_reaction_ms: summary.meanReactionMs,
          mistakes: summary.mistakes,
          hints_used: summary.hintsUsed,
          rounds: summary.rounds,
          duration_ms: endedAt.getTime() - Date.parse(finalResume.startedAt),
          completed,
          abandoned_reason: abandonedReason,
          fatigue_flags: finalResume.fatigueFlags ?? [],
          raw_events: finalResume.metrics.rawEvents,
        },
      };
      await persistLocalResult(patientId, game, session, local);
      setBreakOpen(false);
      setMessageKey(local.messageKey);
      await clearResume(patientId, module.key);
    },
    [challengeMode, difficulty, game, module.key, patientId],
  );
  const answer = useCallback(
    (value: Answer) => {
      if (!resume || !round) return;
      const next = recordAnswer(
        module,
        round,
        resume,
        value,
        Date.now() - roundStarted.current,
      );
      const nextIndex = next.roundIndex;
      const fatigueFlags = detectFatigue({
        events: next.metrics.answers,
        startedAt: next.startedAt,
        sessionCapMinutes,
      });
      const flagged = fatigueFlags.length
        ? {
            ...next,
            fatigueFlags: [
              ...new Set([...(next.fatigueFlags ?? []), ...fatigueFlags]),
            ],
          }
        : next;
      setResumeState(flagged);
      const canPrompt =
        fatigueFlags.length > 0 &&
        nextIndex > (resume.suppressFatigueUntilRound ?? 0);
      if (canPrompt) {
        setBreakOpen(true);
        void saveResume(flagged);
      } else if (nextIndex >= module.roundsForLevel(resume.level))
        void finish(flagged);
      else {
        roundStarted.current = Date.now();
        void saveResume(flagged);
      }
    },
    [finish, module, resume, round, sessionCapMinutes],
  );
  const hint = useCallback(() => {
    if (!resume) return;
    const next = {
      ...resume,
      metrics: { ...resume.metrics, hintsUsed: resume.metrics.hintsUsed + 1 },
    };
    setResumeState(next);
    void saveResume(next);
  }, [resume]);
  const acceptBreak = useCallback(() => {
    if (resume) void finish(resume, false, "break_prompt");
  }, [finish, resume]);
  const continuePlaying = useCallback(() => {
    if (!resume) return;
    const next = {
      ...resume,
      suppressFatigueUntilRound: resume.roundIndex + 3,
    };
    setBreakOpen(false);
    if (resume.roundIndex >= module.roundsForLevel(resume.level))
      void finish(next);
    else {
      roundStarted.current = Date.now();
      setResumeState(next);
      void saveResume(next);
    }
  }, [finish, module, resume]);
  const restart = useCallback(() => {
    setMessageKey(null);
    setResumeState(null);
    void start();
  }, [start]);
  return {
    ready: Boolean(resume && difficulty),
    round,
    roundIndex: resume?.roundIndex ?? 0,
    totalRounds: resume ? module.roundsForLevel(resume.level) : 0,
    messageKey,
    breakOpen,
    answer,
    hint,
    acceptBreak,
    continuePlaying,
    restart,
  };
}
