import "fake-indexeddb/auto";
import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { i18n } from "../src/shared/i18n";
import { MedicinesPage } from "../src/features/patient/medicines/MedicinesPage";
import { db, activatePatient, setSessionUser } from "../src/db/schema";
import { storeOfflineSecrets } from "../src/db/crypto";
import { lockVault } from "../src/db/vault";
import { privateMediaUrl } from "../src/db/media";
import { gameCatalog } from "../src/games/registry";

beforeEach(async () => {
  vi.stubGlobal("crypto", webcrypto);
  lockVault();
  setSessionUser(null);
  await db.delete();
  await db.open();
  await i18n.changeLanguage("en");
});
afterEach(async () => {
  lockVault();
  await db.delete();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test("stopped cached medicine must not appear as current medicine", async () => {
  const repo = {
    getMedications: () =>
      Promise.resolve([
        {
          id: "stopped",
          name: "Stopped prescription",
          dose: "1 tablet",
          times: ["08:00"],
          instructions: "Old instructions",
          active: false,
        },
      ]),
    getToday: () => Promise.resolve([]),
    respond: () => Promise.resolve(),
  };
  render(
    <I18nextProvider i18n={i18n}>
      <MedicinesPage repo={repo} />
    </I18nextProvider>,
  );
  await screen.findByRole("heading", { name: "My medicines" });
  await new Promise((resolve) => setTimeout(resolve, 30));
  expect(screen.queryByText("Stopped prescription")).not.toBeInTheDocument();
});

test("every enabled game has a real English instruction instead of a translation key", () => {
  const missing = gameCatalog
    .filter((g) => g.enabled && i18n.t(g.descriptionKey) === g.descriptionKey)
    .map((g) => g.descriptionKey);
  expect(missing).toEqual([]);
});

test("previously cached signed photo stays available offline after URL rotation", async () => {
  const user = {
    id: "audit-user",
    display_name: "Fictional audit",
    role: "patient" as const,
    email: "",
    phone: "",
  };
  await storeOfflineSecrets("1234", "fictional-token", user);
  setSessionUser(user.id);
  await activatePatient("audit-patient", user.id);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:audit");
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("fictional image", {
        headers: { "Content-Type": "image/png" },
      }),
    ),
  );
  const original = "https://private.example.test/photo.png?X-Amz-Signature=old";
  const rotated = "https://private.example.test/photo.png?X-Amz-Signature=new";
  expect(await privateMediaUrl(original)).toBe("blob:audit");
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  expect(await privateMediaUrl(rotated)).toBe("blob:audit");
});
