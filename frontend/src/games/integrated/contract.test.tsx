import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, describe, expect, it, vi } from "vitest";
import { i18n } from "../../shared/i18n";
import { gameCatalog } from "../registry";
import type { IntegratedGameProps } from "../integratedProps";
import type { PerformanceEvent } from "../engine/integratedTransport";

const integrated = gameCatalog.filter((game) => game.component);
afterEach(() => vi.useRealTimers());
describe.each(integrated)("$key supplied component", (entry) => {
  it.each([1, 2, 3, 4, 5])("plays and exits at difficulty %i with standard metrics", async (level) => {
    const submit = vi.fn<(event: PerformanceEvent) => Promise<{ adjustment: number; source: string }>>()
      .mockResolvedValue({ adjustment: 0, source: "server" });
    const submitMetrics = vi.fn<(event: PerformanceEvent) => Promise<number>>().mockResolvedValue(0);
    const onExit = vi.fn();
    const transport = { submitRound: submit, submitSession: submit, submitMetrics,
      pendingCount: 0 as const, exit: vi.fn().mockResolvedValue(undefined), restart: vi.fn() };
    const props: IntegratedGameProps = { difficulty: level, initialDifficulty: level,
      rng: () => 0.4, seed: "contract-check", speak: vi.fn(), ddaClient: transport,
      submitMetrics, onExit, onSessionEnd: vi.fn(), onComplete: vi.fn(),
      dataProvider: { getItems: () => Promise.resolve([
        { id: "fixture-a", type: "place", displayName: "Garden", imageUrl: "", location: "Garden", note: "", approved: true },
        { id: "fixture-b", type: "place", displayName: "Home", imageUrl: "", location: "Home", note: "", approved: true },
      ]) } };
    const Component = entry.component!;
    render(<I18nextProvider i18n={i18n}><Component {...props} /></I18nextProvider>);
    await act(async () => { await Promise.resolve(); });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(entry.name);
    // Starting and exiting invokes the actual generated hooks, timers and submission path.
    const start = screen.queryByRole("button", { name: /start|i.m ready|let.s begin/i });
    if (start) fireEvent.click(start);
    fireEvent.click(screen.getByRole("button", { name: i18n.t("games.common.exit") }));
    await waitFor(() => expect(onExit).toHaveBeenCalled());
    const submitted = submit.mock.calls.at(-1)?.[0] ?? submitMetrics.mock.calls.at(-1)?.[0];
    expect(submitted).toMatchObject({ game_id: entry.key, difficulty: level,
      completed: false, early_exit: true });
    expect(submitted?.accuracy).toBeGreaterThanOrEqual(0);
    expect(submitted?.accuracy).toBeLessThanOrEqual(1);
    expect(submitted?.rounds_completed).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(submitted?.reaction_time_ms)).toBe(true);
    expect(Number.isFinite(submitted?.session_duration_sec)).toBe(true);
  });
});
