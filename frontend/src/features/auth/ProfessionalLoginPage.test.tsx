import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";

import { renderWithProviders } from "../../test/utils";
import { useAuthStore } from "./authStore";
import { ProfessionalLoginPage } from "./ProfessionalLoginPage";

afterEach(() => {
  vi.unstubAllGlobals();
  useAuthStore.getState().clearSession();
});

test("shows translated awaiting approval message", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          detail: "awaiting_approval",
          code: "awaiting_approval",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      ),
    ),
  );
  const user = userEvent.setup();
  renderWithProviders(<ProfessionalLoginPage role="doctor" />, {
    route: "/login/doctor",
  });

  await user.type(screen.getByLabelText("Email or phone"), "deka@example.com");
  await user.type(screen.getByLabelText("Password"), "not-approved-yet");
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Your account is awaiting verification.",
  );
});
