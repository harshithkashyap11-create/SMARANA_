import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../test/utils";
import { ProgressTab } from "./ProgressTab";

afterEach(() => vi.unstubAllGlobals());

function mockProgress(empty = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : String(input);
      const data =
        url.includes("game-sessions") && !empty
          ? [
              {
                id: "s1",
                game_key: "memory",
                game_name: "Memory Match",
                level: 2,
                metrics: {
                  accuracy: 0.75,
                  mean_reaction_ms: 900,
                  completed: true,
                },
                started_at: new Date().toISOString(),
                ended_at: new Date().toISOString(),
              },
            ]
          : url.includes("difficulty-changes") && !empty
            ? [
                {
                  id: "d1",
                  game_name: "Memory Match",
                  from_level: 1,
                  to_level: 2,
                  reason_code: "promote",
                  explanation: "A consistent pattern supported this change.",
                  created_at: new Date().toISOString(),
                },
              ]
            : [];
      return Promise.resolve(
        new Response(JSON.stringify(data), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }),
  );
}

test("renders session trends, difficulty explanation, and disclaimer", async () => {
  mockProgress();
  renderWithProviders(<ProgressTab patientId="patient-1" />);
  expect(
    await screen.findByRole("img", { name: "Accuracy trend chart" }),
  ).toBeVisible();
  expect(
    screen.getByRole("img", { name: "Response time trend chart" }),
  ).toBeVisible();
  expect(
    screen.getByText("A consistent pattern supported this change."),
  ).toBeVisible();
  expect(screen.getByText(/not a diagnosis/i)).toBeVisible();
});

test("shows calm empty states", async () => {
  mockProgress(true);
  renderWithProviders(<ProgressTab patientId="patient-1" />);
  expect(
    await screen.findByText("No game sessions in this period yet."),
  ).toBeVisible();
  expect(screen.getByText("No caregiver notes yet.")).toBeVisible();
});
