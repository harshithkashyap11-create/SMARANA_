import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/utils";
import { TalkButton } from "./TalkButton";
import { performAction } from "../../voice/actions";

vi.mock("../../db/schema", async (original) => ({
  ...await original<typeof import("../../db/schema")>(),
  activeProfile: vi.fn().mockResolvedValue({ id: "test-patient" }),
  getMeta: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../../db/repo/patient", () => ({ patientRepository: { getFamilyMembers: vi.fn().mockResolvedValue([]) } }));
vi.mock("../../voice/actions", () => ({ performAction: vi.fn().mockResolvedValue(undefined) }));

it("offers typed requests when voice recognition is unavailable and routes the request", async () => {
  const user = userEvent.setup();
  renderWithProviders(<TalkButton />);
  await user.click(screen.getByRole("button", { name: /Talk/ }));
  expect(screen.getByRole("alert")).toHaveTextContent("Voice recognition is unavailable");
  await user.type(screen.getByRole("textbox", { name: "Your request" }), "open games");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() => expect(performAction).toHaveBeenCalledWith(
    expect.objectContaining({ intent: "open_section", slots: { section: "games" } }),
    expect.anything(),
  ));
  expect(screen.getByRole("button", { name: /Talk/ })).toHaveAttribute("aria-pressed", "false");
});
