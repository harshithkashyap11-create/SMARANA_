import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { BigButton } from "./BigButton";

test("uses the 64px minimum touch target", () => {
  renderWithProviders(<BigButton>Continue</BigButton>);

  expect(screen.getByRole("button", { name: "Continue" })).toHaveClass(
    "min-h-touch",
  );
});
