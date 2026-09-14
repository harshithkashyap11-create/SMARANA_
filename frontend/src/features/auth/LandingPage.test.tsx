import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { LandingPage } from "./LandingPage";

test("renders four large role tiles with patient first", () => {
  renderWithProviders(<LandingPage />);

  const tiles = screen.getAllByRole("button").slice(0, 4);
  expect(tiles).toHaveLength(4);
  expect(tiles[0]).toHaveTextContent("Patient");
  for (const tile of tiles) {
    expect(tile).toHaveClass("min-h-touch");
  }
});
