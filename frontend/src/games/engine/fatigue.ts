export type FatigueReason =
  "consecutive_mistakes" | "slow_reactions" | "rapid_taps" | "session_cap";

export interface FatigueEvent {
  correct: boolean;
  reactionMs: number;
}

export interface FatigueInput {
  events: readonly FatigueEvent[];
  startedAt: string | number | Date;
  now?: string | number | Date;
  sessionCapMinutes?: number | null;
}

const time = (value: string | number | Date): number =>
  new Date(value).getTime();

/** Returns every fatigue rule currently matched by the completed event stream. */
export function detectFatigue({
  events,
  startedAt,
  now = Date.now(),
  sessionCapMinutes = 20,
}: FatigueInput): FatigueReason[] {
  const reasons: FatigueReason[] = [];
  const lastFour = events.slice(-4);
  if (lastFour.length === 4 && lastFour.every((event) => !event.correct))
    reasons.push("consecutive_mistakes");

  if (events.length >= 3) {
    const slow = events.map((event, index) => {
      if (index === 0) return false;
      const earlier = events.slice(0, index);
      const runningMean =
        earlier.reduce((sum, item) => sum + item.reactionMs, 0) /
        earlier.length;
      return event.reactionMs > runningMean * 2;
    });
    if (slow.slice(-2).every(Boolean)) reasons.push("slow_reactions");
  }

  const lastThree = events.slice(-3);
  if (
    lastThree.length === 3 &&
    lastThree.every((event) => event.reactionMs < 300)
  )
    reasons.push("rapid_taps");

  const cap = sessionCapMinutes ?? 20;
  if (time(now) - time(startedAt) > cap * 60_000) reasons.push("session_cap");
  return reasons;
}
