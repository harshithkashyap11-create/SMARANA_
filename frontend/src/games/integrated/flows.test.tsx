import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { i18n } from "../../shared/i18n";
import type { PerformanceEvent } from "../engine/integratedTransport";
import VisualSearch from "./visual_search/VisualSearch.jsx";
import PatternCompletion from "./pattern_completion/PatternCompletion.jsx";
import PersonalMemory from "./personal_memory/PersonalMemory.jsx";

describe("actual supplied game session flows", () => {
  it("visual search completes a full session while DDA is unavailable", async () => {
    const submit = vi.fn<(event: PerformanceEvent) => Promise<number>>().mockRejectedValue(new Error("offline"));
    const complete = vi.fn();
    render(<I18nextProvider i18n={i18n}><VisualSearch initialDifficulty={1} seed="flow" submitMetrics={submit} onComplete={complete} onExit={vi.fn()} /></I18nextProvider>);
    for (let round = 0; round < 5; round++) {
      fireEvent.click(screen.getByRole("button", { name: i18n.t("games.common.imReady") }));
      const grid = screen.getByRole("group", { name: i18n.t("games.visualSearch.gridLabel") });
      for (const cell of within(grid).getAllByRole("button")) {
        if (screen.queryByRole("group", { name: i18n.t("games.visualSearch.gridLabel") })) fireEvent.click(cell);
      }
      await act(async () => { await Promise.resolve(); });
      fireEvent.click(screen.getByRole("button", { name: i18n.t(round === 4 ? "games.common.seeSummary" : "games.common.next") }));
    }
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0]?.[0]).toMatchObject({ game_id: "visual_search", difficulty: 1, rounds_completed: 5, completed: true });
    expect(submit).toHaveBeenCalledTimes(5);
  });
  it("pattern completion emits final metrics once and accepts bounded DDA", async () => {
    const submit = vi.fn<(event: PerformanceEvent) => Promise<number>>().mockResolvedValue(0);
    const complete = vi.fn();
    render(<I18nextProvider i18n={i18n}><PatternCompletion initialDifficulty={1} seed="flow" submitMetrics={submit} onComplete={complete} onExit={vi.fn()} /></I18nextProvider>);
    // Each answer either resolves the pattern or offers the answer after three attempts.
    for (let round = 0; round < 5; round++) {
      const choices = screen.getByRole("group", { name: i18n.t("games.patternCompletion.choicesLabel") });
      for (const choice of within(choices).getAllByRole("button")) {
        if (!(choice as HTMLButtonElement).disabled) fireEvent.click(choice);
      }
      await act(async () => { await Promise.resolve(); });
      const next = screen.getByRole("button", { name: i18n.t(round === 4 ? "games.common.seeSummary" : "games.common.next") });
      await waitFor(() => expect(next).toBeEnabled());
      fireEvent.click(next);
    }
    expect(complete).toHaveBeenCalledOnce();
    expect(complete.mock.calls[0]?.[0]).toMatchObject({ game_id: "pattern_completion", completed: true, rounds_completed: 5 });
  });
  it("personal memory works with place-only capsule content at the highest level", async () => {
    const submit = vi.fn<(event: PerformanceEvent) => Promise<number>>().mockResolvedValue(0);
    render(<I18nextProvider i18n={i18n}><PersonalMemory difficulty={5} initialDifficulty={5} seed="capsule" rng={() => 0.4} speak={vi.fn()}
      ddaClient={{ pendingCount: 0, submitRound: vi.fn(), submitSession: vi.fn(), submitMetrics: submit, exit: vi.fn(), restart: vi.fn() }}
      submitMetrics={submit} dataProvider={{ getItems: () => Promise.resolve([
        { id: "place-a", type: "place", displayName: "Garden", imageUrl: "", location: "Garden", note: "" },
        { id: "place-b", type: "place", displayName: "Home", imageUrl: "", location: "Home", note: "" },
      ]) }} onExit={vi.fn()} onComplete={vi.fn()} onSessionEnd={vi.fn()} /></I18nextProvider>);
    const choices = await screen.findByRole("group", { name: i18n.t("games.personalMemory.choicesLabel") });
    fireEvent.click(within(choices).getAllByRole("button")[0]!);
    await waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit.mock.calls[0]?.[0]).toMatchObject({ game_id: "personal_memory", rounds_completed: 1 });
  });
});
