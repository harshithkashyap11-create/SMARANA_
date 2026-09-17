import { screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { renderWithProviders } from "../../../test/utils";
import { ProgressPage } from "./ProgressPage";

it("shows friendly progress without percentages", async () => {
  const { container } = renderWithProviders(
    <ProgressPage
      load={() =>
        Promise.resolve({
          completed_today: 2,
          points: 20,
          streak_days: 3,
          favourite_games: [],
          upcoming: [{ id: "1", title: "Evening walk" }],
        })
      }
    />,
  );
  expect(
    await screen.findByText("You completed 2 things today"),
  ).toBeInTheDocument();
  expect(container.textContent).not.toContain("%");
  expect(screen.getByText("★★★")).toBeInTheDocument();
});
