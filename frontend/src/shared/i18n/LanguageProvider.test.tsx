import { render, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, expect, test, vi } from "vitest";

import { getMeta, setMeta } from "../../db/schema";
import { i18n } from ".";
import { LanguageProvider } from "./LanguageProvider";

vi.mock("../../db/schema", () => ({
  getMeta: vi.fn(),
  setMeta: vi.fn(),
}));

afterEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("en");
});

test("restores the saved language without overwriting it with the default", async () => {
  vi.mocked(getMeta).mockResolvedValue("bn");
  vi.mocked(setMeta).mockResolvedValue();

  render(
    <LanguageProvider>
      <I18nextProvider i18n={i18n}>
        <p>{i18n.language}</p>
      </I18nextProvider>
    </LanguageProvider>,
  );

  await waitFor(() => {
    expect(document.documentElement).toHaveAttribute("lang", "bn");
  });
  expect(setMeta).toHaveBeenLastCalledWith("language", "bn");
});
