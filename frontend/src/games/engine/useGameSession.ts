import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ContentPack } from "../../content/packs";
import {
  clearResume,
  getDifficulty,
  loadResume,
  persistLocalResult,
  saveResume,
  syncSession,
  type GameDefinitionDto,
  type ResumeState,
} from "../../db/repo/games";
import type { CachedGameSession } from "../../db/schema";
import { nextDifficulty, sessionLevel, type DifficultyStateData } from "../dda";
import { type Answer, type GameModule } from "./types";
import { buildRoundAtIndex, recordAnswer } from "./sessionCore";

export interface GameSessionController<R> {
  ready: boolean;
  round: R | null;
  roundIndex: number;
  totalRounds: number;
  messageKey: string | null;
  answer(answer: Answer): void;
  hint(): void;
  restart(): void;
}
const newMetrics = (): ResumeState["metrics"] => ({
  correct: 0,
  mistakes: 0,
  hintsUsed: 0,
  reactionTimes: [],
  rawEvents: [],
});

export function useGameSession<R>(
  module: GameModule<R>,
  game: GameDefinitionDto,
  patientId: string,
  content: ContentPack,
  challengeMode: boolean,
): GameSessionController<R> {
  const [resume, setResumeState] = useState<ResumeState | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyStateData | null>(
    null,
  );
  const [messageKey, setMessageKey] = useState<string | null>(null);
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
    async (finalResume: ResumeState) => {
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
        completed: true,
        challengeMode,
        guestMode: false,
        fatigueFlagged: false,
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
          completed: true,
          abandoned_reason: null,
          fatigue_flags: [],
          raw_events: finalResume.metrics.rawEvents,
        },
      };
      await persistLocalResult(patientId, game, session, local);
      setMessageKey(local.messageKey);
      await clearResume(patientId, module.key);
      try {
        const server = await syncSession(patientId, game, session);
        if (import.meta.env.DEV && server.message_key !== local.messageKey)
          console.warn("DDA reconciliation mismatch", { local, server });
        setMessageKey(server.message_key);
      } catch {
        /* queued locally for the later sync engine */
      }
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
      setResumeState(next);
      if (nextIndex >= module.roundsForLevel(resume.level)) void finish(next);
      else {
        roundStarted.current = Date.now();
        void saveResume(next);
      }
    },
    [finish, module, resume, round],
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
    answer,
    hint,
    restart,
  };
}
