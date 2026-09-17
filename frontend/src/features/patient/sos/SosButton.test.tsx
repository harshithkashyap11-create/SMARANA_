import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/utils";
import { SosButton } from "./SosButton";

const sendSos = vi.fn(() => Promise.resolve());
vi.mock("./sosRepository", () => ({ sendSos: () => sendSos() }));
vi.mock("../../../db/repo/patient", () => ({
  patientRepository: { getFamilyMembers: () => Promise.resolve([]) },
}));

beforeEach(() => { vi.useFakeTimers(); sendSos.mockClear(); });
afterEach(() => vi.useRealTimers());

it("ignores a short press and sends only after long-press confirmation", async () => {
  renderWithProviders(<SosButton />);
  const button = screen.getByRole("button", { name: "SOS" });
  fireEvent.pointerDown(button); fireEvent.pointerUp(button);
  await act(() => vi.advanceTimersByTime(2000));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  fireEvent.pointerDown(button);
  await act(() => vi.advanceTimersByTime(2000));
  fireEvent.pointerUp(button);
  fireEvent.click(screen.getByRole("button", { name: "Yes, tell my caregiver" }));
  await act(async () => Promise.resolve());
  expect(sendSos).toHaveBeenCalledOnce();
});
