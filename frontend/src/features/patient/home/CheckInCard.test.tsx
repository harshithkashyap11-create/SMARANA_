import { beforeEach, expect, test, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "../../../test/utils";
import { CheckInCard } from "./CheckInCard";
const state = vi.hoisted(() => ({
  meta: new Map<string, string>(),
  put: vi.fn(),
}));
vi.mock("../../../db/schema", () => ({
  getMeta: (key: string) => Promise.resolve(state.meta.get(key)),
  setMeta: (key: string, value: string) => {
    state.meta.set(key, value);
    return Promise.resolve();
  },
  db: {
    meta: {},
    outbox: { put: state.put },
    transaction: async (
      _mode: string,
      _meta: unknown,
      _outbox: unknown,
      work: () => Promise<void>,
    ) => work(),
  },
}));
beforeEach(() => {
  state.meta.clear();
  state.put.mockReset().mockResolvedValue(undefined);
  state.meta.set("patientId", "p");
  state.meta.set(
    "checkins",
    JSON.stringify([{ id: "c", requested_by: "Priya", answer: null }]),
  );
});
test("saves a check-in reply locally, queues one patient-owned response and survives remount", async () => {
  const view = renderWithProviders(<CheckInCard />);
  fireEvent.click(await screen.findByRole("button", { name: "I am okay" }));
  await waitFor(() => expect(state.put).toHaveBeenCalledTimes(1));
  expect(state.put.mock.calls[0]?.[0]).toMatchObject({
    model: "checkin_response",
    patientId: "p",
    payload: { patient_id: "p", checkin: "c", answer: "okay" },
  });
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "I am okay" })).toBeNull(),
  );
  view.unmount();
  renderWithProviders(<CheckInCard />);
  await waitFor(() => expect(screen.queryByRole("heading")).toBeNull());
  expect(state.put).toHaveBeenCalledTimes(1);
});
test("failed local writes show a gentle retry message", async () => {
  state.put.mockRejectedValueOnce(new Error("Storage unavailable"));
  renderWithProviders(<CheckInCard />);
  fireEvent.click(await screen.findByRole("button", { name: "I need help" }));
  expect(await screen.findByRole("alert")).toBeVisible();
});
