import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { Card } from "./Card";

test("renders card content", () => {
  renderWithProviders(<Card>Today's memory</Card>);

  expect(screen.getByText("Today's memory")).toBeVisible();
});
