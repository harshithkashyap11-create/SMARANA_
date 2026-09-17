import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

test("switches the landing copy and document language using native language tiles", async () => {
  const user = userEvent.setup();
  renderWithProviders(<LandingPage />);

  await user.click(screen.getByRole("button", { name: "বাংলা" }));

  expect(
    screen.getByText("প্রতিদিনের জন্য সহজ সহায়তা।"),
  ).toBeInTheDocument();
  expect(document.documentElement).toHaveAttribute("lang", "bn");
});
