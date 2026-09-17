import { act, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { useThemeStore } from "./store";

test("applies theme and font scale tokens", async () => {
  renderWithProviders(<p>Theme preview</p>);

  act(() => {
    useThemeStore.getState().setTheme("dark");
    useThemeStore.getState().setFontScale(1.4);
  });

  await waitFor(() => {
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(document.documentElement).toHaveAttribute("data-font-scale", "1.4");
    expect(document.documentElement.style.getPropertyValue("--scale")).toBe(
      "1.4",
    );
  });
  expect(screen.getByText("Theme preview")).toBeVisible();
});
