interface Session { ended_at: string; level: number; game_key: string; metrics: { completed?: boolean; accuracy?: number; hints_used?: number; rounds?: number; abandoned_reason?: string | null } }
/** Descriptive game participation; no diagnostic or clinical scoring. */
export function summarizeGameParticipation(sessions: Session[], cutoff: number) {
  const rows = sessions.filter((session) => Date.parse(session.ended_at) >= cutoff);
  const completed = rows.filter((session) => session.metrics.completed);
  const accuracies = completed.flatMap((session) => typeof session.metrics.accuracy === "number" ? [session.metrics.accuracy] : []);
  return { played: rows.length, completed: completed.length,
    averageAccuracy: accuracies.length ? accuracies.reduce((sum, accuracy) => sum + accuracy, 0) / accuracies.length : null,
    hintsPerRound: rows.reduce((sum, session) => sum + (session.metrics.hints_used ?? 0), 0) / Math.max(1, rows.reduce((sum, session) => sum + (session.metrics.rounds ?? 0), 0)),
    earlyExits: rows.filter((session) => session.metrics.abandoned_reason === "user_exit").length,
    gamesPlayed: new Set(rows.map((session) => session.game_key)).size,
  };
}
