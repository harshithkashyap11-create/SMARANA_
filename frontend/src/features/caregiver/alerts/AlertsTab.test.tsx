import { screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { renderWithProviders } from "../../../test/utils";
import { AlertsTab } from "./AlertsTab";

afterEach(() => vi.unstubAllGlobals());

test("shows SOS first and disables forwarding without an assigned doctor", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            {
              id: "alert-1",
              rule_key: "sos",
              severity: "high",
              title: "Emergency help requested",
              explanation: "Rao requested help at 10:00.",
              evidence: { reminder_ids: ["one"] },
              triggered_at: "2026-09-15T10:00:00Z",
              status: "open",
              notes: "",
              can_forward: false,
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ),
  );
  renderWithProviders(<AlertsTab patientId="patient-1" />);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Emergency help requested",
  );
  expect(
    screen.getByRole("button", { name: "Forward to doctor" }),
  ).toBeDisabled();
  expect(screen.getByRole("link", { name: "reminder 1" })).toHaveAttribute(
    "href",
    "#reminder-one",
  );
});
