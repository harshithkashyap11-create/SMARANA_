import { screen } from "@testing-library/react";
import { expect, test } from "vitest";

import { useAppContext } from "../app/context";
import { renderWithProviders } from "./utils";

function ContextProbe() {
  const { repos, role } = useAppContext();
  return <p>{`${role}:${String(repos.memories)}`}</p>;
}

test("provides the requested role and fake repositories", () => {
  renderWithProviders(<ContextProbe />, {
    role: "patient",
    repos: { memories: "in-memory" },
  });

  expect(screen.getByText("patient:in-memory")).toBeVisible();
});
