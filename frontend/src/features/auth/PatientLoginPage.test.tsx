import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

import { ApiError } from "../../api/client";
import { renderWithProviders } from "../../test/utils";
import { useAuthStore } from "./authStore";
import { PatientLoginPage } from "./PatientLoginPage";

vi.mock("../../db/schema", () => ({
  getMeta: vi.fn().mockResolvedValue("RAO1234"),
  setMeta: vi.fn().mockResolvedValue(undefined),
}));

const session = {
  access: "access",
  refresh: "refresh",
  user: {
    id: "1",
    display_name: "Rao Garu",
    email: "",
    phone: "",
    role: "patient" as const,
  },
};

beforeEach(() => {
  window.localStorage.clear();
  useAuthStore.setState({
    accessToken: null,
    role: null,
    user: null,
  });
});

test("auto-submits after four digits with the remembered login id", async () => {
  const user = userEvent.setup();
  const patientLogin = vi.fn().mockResolvedValue(session);
  useAuthStore.setState({ patientLogin });
  renderWithProviders(<PatientLoginPage />);

  expect(await screen.findByDisplayValue("RAO1234")).toBeVisible();
  for (const digit of ["1", "2", "3", "4"]) {
    await user.click(screen.getByRole("button", { name: digit }));
  }

  await waitFor(() =>
    expect(patientLogin).toHaveBeenCalledWith(
      expect.objectContaining({ login_id: "RAO1234", pin: "1234" }),
    ),
  );
});

test("shows gentle caregiver copy when the PIN is locked", async () => {
  const user = userEvent.setup();
  useAuthStore.setState({
    patientLogin: vi
      .fn()
      .mockRejectedValue(new ApiError(423, { code: "locked" })),
  });
  renderWithProviders(<PatientLoginPage />);

  await screen.findByDisplayValue("RAO1234");
  for (const digit of ["1", "2", "3", "4"]) {
    await user.click(screen.getByRole("button", { name: digit }));
  }

  expect(
    await screen.findByText(
      "Let's take a break. Your caregiver has been told.",
    ),
  ).toBeVisible();
});
