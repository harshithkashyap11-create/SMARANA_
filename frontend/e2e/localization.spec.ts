import { expect, test, type Page } from "@playwright/test";
import en from "../src/shared/i18n/en.json" with { type: "json" };
import as from "../src/shared/i18n/as.json" with { type: "json" };
import bn from "../src/shared/i18n/bn.json" with { type: "json" };

async function navigate(page: Page, path: string) {
  await page.evaluate((path) => {
    history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}
for (const [language, catalog] of Object.entries({ en, as, bn })) {
  test(`${language}: patient flows, explicit content availability, and persisted language`, async ({
    page,
    context,
  }) => {
    test.setTimeout(60_000);
    let available = true;
    await page.route("**/api/v1/**", async (route) => {
      if (!available) {
        await route.fulfill({ status: 503, json: {} });
        return;
      }
      const path = new URL(route.request().url()).pathname;
      let json: unknown = [];
      if (path.endsWith("/auth/patient/login/"))
        json = {
          access: "locale-access",
          refresh: "locale-refresh",
          user: {
            id: "locale-user",
            role: "patient",
            display_name: "Rao",
            phone: "",
            email: "",
          },
        };
      else if (path.endsWith("/auth/refresh/"))
        json = { access: "locale-access", refresh: "locale-refresh" };
      else if (path.endsWith("/patients/"))
        json = {
          results: [
            { id: "locale-patient", name: "Rao", region: "AS", language },
          ],
        };
      else if (path.endsWith("/orientation/"))
        json = {
          greeting_key: "morning",
          day: "Wednesday",
          date: "16 September",
          time: "8:00 AM",
          home_label: "",
          next_activity: null,
          family_member: null,
        };
      else if (path.includes("/content/pack")) {
        await route.fulfill({
          status: 404,
          json: { code: "translation_unavailable" },
        });
        return;
      } else if (path.endsWith("/games/"))
        json = [
          {
            key: "memory_match",
            name: "Memory Match",
            cognitive_domains: ["memory"],
            min_level: 1,
            max_level: 10,
            is_regional: true,
          },
        ];
      else if (path.endsWith("/profile/")) json = { known_places: [] };
      else if (path.endsWith("/sync/pull/"))
        json = {
          server_time: new Date().toISOString(),
          patient_id: "locale-patient",
          records: {},
        };
      await route.fulfill({ json });
    });
    await page.goto("/");
    await page
      .getByRole("button", {
        name: { en: "English", as: "অসমীয়া", bn: "বাংলা" }[language],
        exact: true,
      })
      .click();
    await expect(
      page.getByText(catalog.localization.notice, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: new RegExp(catalog.landing.patient) })
      .click();
    await expect(
      page.getByRole("heading", { name: catalog.auth.patientPinTitle }),
    ).toBeVisible();
    await page
      .getByLabel(catalog.auth.loginId, { exact: true })
      .fill("RAO1234");
    for (const digit of "1234")
      await page.getByRole("button", { name: digit, exact: true }).click();
    await expect(page).toHaveURL(/(?<!login)\/patient$/);
    // The offline orientation uses the device's real clock, unlike the API fixture.
    await expect(
      page.getByRole("heading", {
        name: new RegExp(
          [
            catalog.home.greeting_morning,
            catalog.home.greeting_afternoon,
            catalog.home.greeting_evening,
          ]
            .map((greeting) => greeting.replace("{{name}}", "Rao"))
            .join("|"),
        ),
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: catalog.walkthrough.gotIt, exact: true })
      .click();
    for (const [path, title] of [
      ["routine", catalog.routine.title],
      ["medicines", catalog.medicines.title],
      ["memories", catalog.memories.title],
      ["games", catalog.games.title],
    ] as const) {
      await navigate(page, `/patient/${path}`);
      await expect(
        page.getByRole("heading", { name: title, exact: true }),
      ).toBeVisible();
      const dismiss = page.getByRole("button", {
        name: catalog.walkthrough.gotIt,
        exact: true,
      });
      await dismiss.click();
    }
    await expect(
      page.getByRole("link", {
        name: new RegExp(catalog.gameNames.memory_match),
      }),
    ).toBeVisible();
    await navigate(page, "/patient/games/memory_match");
    // Integrated games use bundled practice material; regional fallback is explicit.
    await expect(
      page.getByText(
        language === "en"
          ? catalog.games.demoContent
          : en.games.translationFallback,
        { exact: true },
      ),
    ).toBeVisible();
    await navigate(page, "/patient/settings");
    const settingsInstructions = page.getByRole("button", {
      name: catalog.walkthrough.gotIt,
      exact: true,
    });
    await settingsInstructions.click();
    await expect(
      page.getByRole("combobox", {
        name: catalog.settings.language,
        exact: true,
      }),
    ).toHaveValue(language);
    await page
      .getByRole("button", { name: catalog.sos.label, exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByText(catalog.sos.confirm, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: catalog.sos.no, exact: true })
      .click();
    await context.setOffline(true);
    await expect(
      page.getByText(new RegExp(catalog.offline.working)),
    ).toBeVisible();
    // Network failure also exercises the PIN unlock path after a fresh document load.
    await context.setOffline(false);
    available = false;
    await page.reload();
    await expect(
      page.getByText(catalog.localization.notice, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: new RegExp(catalog.landing.patient) })
      .click();
    await expect(
      page.getByRole("heading", { name: catalog.auth.patientPinTitle }),
    ).toBeVisible();
    await page
      .getByLabel(catalog.auth.loginId, { exact: true })
      .fill("RAO1234");
    for (const digit of "9999")
      await page.getByRole("button", { name: digit, exact: true }).click();
    await expect(page.getByRole("alert")).toHaveText(catalog.auth.pin_no_match);
    for (const digit of "1234")
      await page.getByRole("button", { name: digit, exact: true }).click();
    await expect(page).toHaveURL(/(?<!login)\/patient$/);
    await expect(
      page.getByRole("heading", {
        name: new RegExp(
          [
            catalog.home.greeting_morning,
            catalog.home.greeting_afternoon,
            catalog.home.greeting_evening,
          ]
            .map((greeting) => greeting.replace("{{name}}", "Rao"))
            .join("|"),
        ),
      }),
    ).toBeVisible();
  });
}
