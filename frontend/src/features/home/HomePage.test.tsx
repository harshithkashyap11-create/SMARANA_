import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { HomePage } from "./HomePage";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("shows backend status after a successful health check", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok", db: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );

  renderWithProviders(<HomePage />);

  expect(screen.getByText("One moment…")).toBeVisible();
  expect(await screen.findByText("Backend OK")).toBeVisible();
});

test("uses supportive copy when the health check is unavailable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
  );

  renderWithProviders(<HomePage />);

  expect(
    await screen.findByText("Something didn't work. Let's try again."),
  ).toBeVisible();
});
