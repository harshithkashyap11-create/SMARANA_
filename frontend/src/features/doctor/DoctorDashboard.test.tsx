import { screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { DoctorDashboard } from "./DoctorDashboard";

const json = (body: unknown) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      json({
        patients: [
          {
            id: "p1",
            name: "Rao",
            flag_count: 2,
            last_session_at: "2026-09-14T08:00:00Z",
            engagement_status: "active",
          },
          {
            id: "p2",
            name: "Mira",
            flag_count: 0,
            last_session_at: null,
            engagement_status: "inactive",
          },
        ],
        needs_attention: [
          {
            id: "p1",
            name: "Rao",
            flag_count: 2,
            last_session_at: "2026-09-14T08:00:00Z",
            engagement_status: "active",
          },
        ],
        reviews_due: [],
        recent_completed: [],
      }),
    ),
  );
});

afterEach(() => vi.unstubAllGlobals());

test("patient cards show flag counts and last session dates", async () => {
  renderWithProviders(<DoctorDashboard />);

  const raoHeading = await screen.findByRole("heading", { name: "Rao" });
  const raoCard = raoHeading.closest("article");
  expect(raoCard).not.toBeNull();
  expect(within(raoCard!).getByText("2")).toBeInTheDocument();
  expect(within(raoCard!).getByText("9/14/2026")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Mira" })).toBeInTheDocument();
  expect(screen.getByText("No sessions yet")).toBeInTheDocument();
});
