import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { IconTile } from "./IconTile";

test("combines an icon with an accessible large target", () => {
  renderWithProviders(
    <IconTile icon={<span aria-hidden="true">⌂</span>} label="Home" />,
  );

  expect(screen.getByRole("button", { name: "Home" })).toHaveClass(
    "min-h-touch",
  );
});
