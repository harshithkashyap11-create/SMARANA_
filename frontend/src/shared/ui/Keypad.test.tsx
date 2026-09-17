import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { Keypad } from "./Keypad";

test("renders every keypad action as a 64px minimum touch target", async () => {
  const user = userEvent.setup();
  const onDigit = vi.fn();
  renderWithProviders(
    <Keypad
      backspaceLabel="Backspace"
      label="PIN keypad"
      onBackspace={vi.fn()}
      onDigit={onDigit}
    />,
  );

  const buttons = screen.getAllByRole("button");
  expect(buttons).toHaveLength(11);
  for (const button of buttons) expect(button).toHaveClass("min-h-touch");

  await user.click(screen.getByRole("button", { name: "4" }));
  expect(onDigit).toHaveBeenCalledWith("4");
});
