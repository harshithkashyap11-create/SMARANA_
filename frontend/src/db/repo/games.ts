import { apiClient } from "../../api/client";
import type {
  DdaResult,
  DifficultyStateData,
  SessionSummary,
} from "../../games/dda";
import { db, getMeta, setMeta, type CachedGameSession } from "../schema";

export interface GameDefinitionDto {
  key: string;
  name: string;
  cognitive_domains: string[];
  min_level: number;
  max_level: number;
  is_regional: boolean;
}
export interface ResumeState {
  gameKey: string;
  patientId: string;
  seed: string;
  level: number;
  roundIndex: number;
  startedAt: string;
  metrics: {
    correct: number;
    mistakes: number;
    hintsUsed: number;
    reactionTimes: number[];
    rawEvents: unknown[];
  };
}
export const resumeKey = (patientId: string, gameKey: string): string =>
  `game-resume:${patientId}:${gameKey}`;
export async function listGames(): Promise<GameDefinitionDto[]> {
  return apiClient("/api/v1/games/", { method: "GET" });
}
export async function loadResume(
  patientId: string,
  gameKey: string,
): Promise<ResumeState | null> {
  const value = await getMeta(resumeKey(patientId, gameKey));
  return value ? (JSON.parse(value) as ResumeState) : null;
}
export async function saveResume(value: ResumeState): Promise<void> {
  await setMeta(
    resumeKey(value.patientId, value.gameKey),
    JSON.stringify(value),
  );
}
export async function clearResume(
  patientId: string,
  gameKey: string,
): Promise<void> {
  await db.meta.delete(resumeKey(patientId, gameKey));
}
export async function getDifficulty(
  patientId: string,
  game: GameDefinitionDto,
): Promise<DifficultyStateData> {
  const state = await db.difficultyStates
    .where({ patientId, gameKey: game.key })
    .first();
  return state
    ? {
        level: state.level,
        window: state.window as SessionSummary[],
        lockedByDoctor: state.lockedByDoctor,
        capLevel: state.capLevel,
        minLevel: state.minLevel,
        maxLevel: state.maxLevel,
      }
    : {
        level: game.min_level,
        window: [],
        lockedByDoctor: false,
        capLevel: null,
        minLevel: game.min_level,
        maxLevel: game.max_level,
      };
}
export async function persistLocalResult(
  patientId: string,
  game: GameDefinitionDto,
  session: CachedGameSession,
  result: DdaResult,
): Promise<void> {
  const stateId = `${patientId}:${game.key}`;
  await db.transaction(
    "rw",
    db.gameSessions,
    db.difficultyStates,
    db.difficultyChanges,
    async () => {
      await db.gameSessions.put(session);
      await db.difficultyStates.put({
        id: stateId,
        patientId,
        gameKey: game.key,
        level: result.state.level,
        window: result.state.window,
        lockedByDoctor: result.state.lockedByDoctor,
        capLevel: result.state.capLevel,
        minLevel: result.state.minLevel,
        maxLevel: result.state.maxLevel,
      });
      await db.difficultyChanges.put({
        id: crypto.randomUUID(),
        stateId,
        sessionId: session.id,
        fromLevel: result.change.fromLevel,
        toLevel: result.change.toLevel,
        reasonCode: result.change.reasonCode,
        explanation: result.change.explanation,
      });
    },
  );
}
export async function syncSession(
  patientId: string,
  game: GameDefinitionDto,
  session: CachedGameSession,
): Promise<{
  state: {
    level: number;
    window: SessionSummary[];
    locked_by_doctor: boolean;
    cap_level: number | null;
  };
  message_key: string;
}> {
  const response = await apiClient<{
    state: {
      level: number;
      window: SessionSummary[];
      locked_by_doctor: boolean;
      cap_level: number | null;
    };
    message_key: string;
  }>(`/api/v1/patients/${patientId}/game-sessions/`, {
    method: "POST",
    body: JSON.stringify({
      game_key: session.gameKey,
      seed: session.seed,
      level: session.level,
      metrics: session.metrics,
      challenge_mode: session.challengeMode,
      started_at: session.startedAt,
      ended_at: session.endedAt,
    }),
  });
  await db.transaction("rw", db.gameSessions, db.difficultyStates, async () => {
    await db.gameSessions.update(session.id, { synced: true });
    await db.difficultyStates.put({
      id: `${patientId}:${game.key}`,
      patientId,
      gameKey: game.key,
      level: response.state.level,
      window: response.state.window,
      lockedByDoctor: response.state.locked_by_doctor,
      capLevel: response.state.cap_level,
      minLevel: game.min_level,
      maxLevel: game.max_level,
    });
  });
  return response;
}
