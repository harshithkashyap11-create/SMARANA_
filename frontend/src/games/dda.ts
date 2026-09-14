export interface SessionSummary {
  level: number;
  accuracy: number;
  meanReactionMs: number;
  mistakes: number;
  hintsUsed: number;
  rounds: number;
  completed: boolean;
  challengeMode: boolean;
  guestMode: boolean;
  fatigueFlagged: boolean;
}
export interface DifficultyStateData {
  level: number;
  window: SessionSummary[];
  lockedByDoctor: boolean;
  capLevel: number | null;
  minLevel: number;
  maxLevel: number;
  lockedByName?: string;
}
export interface DdaConfig {
  windowSize: number;
  promoteAccuracy: number;
  demoteAccuracy: number;
  reactionWorsenRatio: number;
  hintPenaltyPerRound: number;
}
export type ReasonCode =
  | "promote"
  | "hold"
  | "demote"
  | "doctor_lock"
  | "cap"
  | "insufficient_data"
  | "guest"
  | "fatigue_hold";
export interface DdaChange {
  fromLevel: number;
  toLevel: number;
  reasonCode: ReasonCode;
  explanation: string;
}
export interface DdaResult {
  state: DifficultyStateData;
  change: DdaChange;
  messageKey: string;
}
export const defaultDdaConfig: DdaConfig = {
  windowSize: 3,
  promoteAccuracy: 0.85,
  demoteAccuracy: 0.6,
  reactionWorsenRatio: 1.25,
  hintPenaltyPerRound: 0.5,
};

function result(
  state: DifficultyStateData,
  toLevel: number,
  reasonCode: ReasonCode,
  explanation: string,
  messageKey: string,
  clear = false,
): DdaResult {
  return {
    state: { ...state, level: toLevel, window: clear ? [] : state.window },
    change: { fromLevel: state.level, toLevel, reasonCode, explanation },
    messageKey,
  };
}

export function nextDifficulty(
  state: DifficultyStateData,
  session: SessionSummary,
  config: DdaConfig = defaultDdaConfig,
): DdaResult {
  if (session.guestMode)
    return result(
      state,
      state.level,
      "guest",
      "Guest sessions do not affect difficulty.",
      "dda.thanks_for_playing",
    );
  const updated = {
    ...state,
    window: [...state.window, session].slice(-config.windowSize),
  };
  if (state.lockedByDoctor)
    return result(
      updated,
      state.level,
      "doctor_lock",
      `Difficulty is locked by Dr. ${state.lockedByName ?? "the care team"}.`,
      "dda.same_next_time",
    );
  if (updated.window.length < config.windowSize)
    return result(
      updated,
      state.level,
      "insufficient_data",
      "More sessions are needed before adjusting difficulty.",
      "dda.same_next_time",
    );
  if (session.fatigueFlagged || !session.completed)
    return result(
      updated,
      state.level,
      "fatigue_hold",
      "Held because the latest session was cut short or a break was suggested.",
      "dda.thanks_for_playing",
    );
  const low = updated.window.every(
    (item) => item.accuracy < config.demoteAccuracy,
  );
  const earlier = updated.window.slice(0, -1);
  const earlierMean =
    earlier.reduce((sum, item) => sum + item.meanReactionMs, 0) /
    earlier.length;
  const slower =
    session.meanReactionMs >= config.reactionWorsenRatio * earlierMean;
  const frequent = session.mistakes >= session.rounds / 2;
  if (low && (slower || frequent)) {
    const target = Math.max(state.minLevel, state.level - 1);
    return result(
      updated,
      target,
      "demote",
      `Accuracy stayed under 60% across 3 rounds while ${slower ? "reaction time increased" : "mistakes were frequent"}.`,
      "dda.easier_next_time",
      target !== state.level,
    );
  }
  const high = updated.window.every(
    (item) => item.accuracy >= config.promoteAccuracy,
  );
  const fewHints = updated.window.every(
    (item) =>
      item.hintsUsed / Math.max(item.rounds, 1) < config.hintPenaltyPerRound,
  );
  const meanRt =
    updated.window.reduce((sum, item) => sum + item.meanReactionMs, 0) /
    updated.window.length;
  if (high && fewHints && session.meanReactionMs <= 1.1 * meanRt) {
    const ceiling = Math.min(state.maxLevel, state.capLevel ?? state.maxLevel);
    const target = Math.min(ceiling, state.level + 1);
    if (target === state.level && state.capLevel !== null)
      return result(
        updated,
        target,
        "cap",
        `Reached the doctor-set cap of level ${state.capLevel}.`,
        "dda.same_next_time",
        true,
      );
    if (target !== state.level)
      return result(
        updated,
        target,
        "promote",
        "Accuracy stayed at or above 85% with few hints.",
        "dda.harder_next_time",
        true,
      );
  }
  return result(
    updated,
    state.level,
    "hold",
    "Performance within target range.",
    "dda.same_next_time",
  );
}

export function sessionLevel(
  state: DifficultyStateData,
  challengeMode: boolean,
): number {
  return challengeMode
    ? Math.min(
        state.level + 1,
        state.capLevel ?? state.maxLevel,
        state.maxLevel,
      )
    : state.level;
}
