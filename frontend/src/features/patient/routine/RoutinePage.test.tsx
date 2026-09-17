import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { RoutineRepository } from "../../../db/repo/routine";
import { renderWithProviders } from "../../../test/utils";
import { RoutinePage } from "./RoutinePage";

function repository(category = "medicine") {
  const respond = vi.fn().mockResolvedValue(undefined);
  const repo: RoutineRepository = {
    getToday: vi.fn().mockResolvedValue([
      {
        id: "r1",
        title: "Morning tablet",
        category,
        note: "With water",
        scheduled_at: "2026-09-14T08:00:00Z",
        status: "pending",
        snoozed_until: null,
      },
    ]),
    getMedications: vi.fn().mockResolvedValue([]),
    respond,
  };
  return { repo, respond };
}

describe("RoutinePage", () => {
  it("confirms a medicine skip", async () => {
    const { repo, respond } = repository();
    renderWithProviders(<RoutinePage repo={repo} />);
    await userEvent.click(await screen.findByRole("button", { name: "Skip" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(respond).not.toHaveBeenCalled();
  });
  it("shows undo after taken and calls the repository", async () => {
    const { repo, respond } = repository("walk");
    renderWithProviders(<RoutinePage repo={repo} />);
    await userEvent.click(await screen.findByRole("button", { name: "Taken" }));
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(respond).toHaveBeenCalledWith("r1", "taken");
  });
});
