import { fireEvent, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { renderWithProviders } from "../../../test/utils";
import { PeoplePage } from "./PeoplePage";

vi.mock("../../../db/repo/patient", () => ({
  patientRepository: {
    getFamilyMembers: () => Promise.resolve([{ id: "1", patientId: "p", name: "Priya", relationship: "daughter", photoUrl: null, phone: "+91123", isEmergencyContact: true }]),
  },
}));

it("confirms before starting a telephone call", async () => {
  const call = vi.fn();
  renderWithProviders(<PeoplePage call={call} />);
  fireEvent.click(await screen.findByRole("button", { name: /Priya/ }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Call Priya?");
  fireEvent.click(screen.getByRole("button", { name: "Yes, call" }));
  expect(call).toHaveBeenCalledWith("+91123");
});
