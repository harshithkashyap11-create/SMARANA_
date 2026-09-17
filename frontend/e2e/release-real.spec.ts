import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import en from "../src/shared/i18n/en.json" with { type: "json" };

test.skip(
  process.env.SMARANA_REAL_BACKEND !== "1",
  "Requires fictional seeded local backend",
);
test.use({ actionTimeout: 10_000 });
const backend = process.env.SMARANA_BACKEND_URL ?? "http://127.0.0.1:8000";
const password = "SmaranaDemo123!";

async function professional(request: APIRequestContext, email: string) {
  const login = await request.post(`${backend}/api/v1/auth/login/`, {
    data: { email_or_phone: email, password, device_id: `release-${email}` },
  });
  expect(login.ok()).toBeTruthy();
  const { access } = (await login.json()) as { access: string };
  return { Authorization: `Bearer ${access}` };
}
async function patientId(
  request: APIRequestContext,
  headers: Record<string, string>,
) {
  const result = await request.get(`${backend}/api/v1/patients/`, { headers });
  expect(result.ok()).toBeTruthy();
  return (
    (await result.json()) as { results: Array<{ id: string; name: string }> }
  ).results.find((patient) => patient.name === "Rao")!.id;
}
async function dismiss(page: Page) {
  const dialog = page.getByRole("dialog", {
    name: "Instructions",
    exact: true,
  });
  if (await dialog.isVisible())
    await dialog.getByRole("button", { name: "Got it", exact: true }).click();
}
async function patientLogin(page: Page) {
  await page.goto("/login/patient");
  await page.getByLabel("Login ID").fill("RAO1234");
  for (const digit of "1234")
    await page.getByRole("button", { name: digit, exact: true }).click();
  await expect(page).toHaveURL(/(?<!login)\/patient$/);
  await expect(page.locator("main h1")).toBeVisible();
  await dismiss(page);
}
async function ask(page: Page, command: string) {
  if (
    !(await page.getByRole("textbox", { name: en.voice.request }).isVisible())
  )
    await page.getByRole("button", { name: /Talk/ }).click();
  await page.getByRole("textbox", { name: en.voice.request }).fill(command);
  await page.getByRole("button", { name: "Send", exact: true }).click();
}

test("voice actions launch real gameplay, persist DDA metrics and a daily reminder", async ({
  page,
  request,
}) => {
  test.setTimeout(90_000);
  // Exercise the actual supported no-audio fallback, not an invented STT transcript.
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", { value: undefined });
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: undefined,
    });
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const caregiver = await professional(request, "priya@example.com");
  const id = await patientId(request, caregiver);
  await patientLogin(page);
  await ask(page, "Open Pattern Completion");
  await expect(page).toHaveURL(/\/patient\/games\/pattern_completion$/);
  await expect(
    page.getByRole("heading", { name: "Pattern Completion", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Got it", exact: true }),
  ).toBeVisible();
  await dismiss(page);
  const observations: Array<Record<string, unknown>> = [];
  page.on("response", async (response) => {
    if (response.url().endsWith("/api/v1/game-events/") && response.ok())
      observations.push((await response.json()) as Record<string, unknown>);
  });
  for (let round = 0; round < 5; round++) {
    const choices = page.locator(".sm-choices button");
    const next = page.getByRole("button", {
      name: round === 4 ? en.games.common.seeSummary : en.games.common.next,
      exact: true,
    });
    await expect(choices.first()).toBeVisible();
    for (let index = 0; index < (await choices.count()); index++) {
      if (await next.isVisible()) break;
      if (await choices.nth(index).isEnabled())
        await choices.nth(index).click();
    }
    await expect(next).toBeEnabled();
    await next.click();
  }
  await expect(
    page.getByRole("heading", {
      name: en.games.common.sessionFinished,
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const result = await request.get(
        `${backend}/api/v1/patients/${id}/game-sessions/`,
        { headers: caregiver },
      );
      const rows = (await result.json()) as Array<{
        game_key: string;
        started_at: string;
        metrics: { completed?: boolean; dda?: { final_difficulty: number } };
      }>;
      return rows.find(
        (row) =>
          row.game_key === "pattern_completion" &&
          row.metrics.completed &&
          Date.parse(row.started_at) > Date.now() - 90_000,
      );
    })
    .toMatchObject({ metrics: { completed: true } });
  expect(observations.length).toBeGreaterThan(0);
  for (const observation of observations) {
    expect(Number(observation.adjustment)).toBeGreaterThanOrEqual(-1);
    expect(Number(observation.adjustment)).toBeLessThanOrEqual(1);
  }
  await ask(page, "Go home");
  await expect(page).toHaveURL(/\/patient$/);
  const title = `release medicine ${Date.now()}`;
  await ask(page, `Remind me every day at 8 PM to take ${title}`);
  const confirmation = page
    .getByRole("dialog")
    .filter({ hasText: "Shall I remind you" });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Yes", exact: true }).click();
  await expect
    .poll(
      async () => {
        const response = await request.get(
          `${backend}/api/v1/patients/${id}/routine-items/`,
          { headers: caregiver },
        );
        return (
          (await response.json()) as Array<{
            title: string;
            days_of_week: number[];
            end_date: string | null;
          }>
        ).find((row) => row.title.includes(title));
      },
      { timeout: 15_000 },
    )
    .toMatchObject({ days_of_week: [0, 1, 2, 3, 4, 5, 6], end_date: null });
  await ask(page, "What's my schedule?");
  await expect(page).toHaveURL(/\/patient\/routine$/);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await dismiss(page);
  await expect(page.getByText(`take ${title}`, { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("caregiver uploads a private capsule photo and creates a routine through real forms", async ({
  page,
  request,
}) => {
  test.setTimeout(60_000);
  const headers = await professional(request, "priya@example.com");
  const id = await patientId(request, headers);
  const title = `Release memory ${Date.now()}`;
  await page.goto("/login/caregiver");
  await page.getByLabel("Email or phone").fill("priya@example.com");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Rao", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Memories", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page
    .getByLabel("Short story")
    .fill("Fictional release verification of a family afternoon.");
  await page.getByLabel("Photos", { exact: false }).setInputFiles({
    name: "demo.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAIAAAAC64paAAAAHUlEQVR4nGM0SoliIBcwka1zVPOo5lHNo5qpohkA2ggBGK0060IAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  const photoResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/memories/") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  const uploaded = await photoResponse;
  expect(uploaded.status(), await uploaded.text()).toBe(201);
  await expect(page.getByRole("status")).toHaveText(
    "Memory saved. It is ready to revisit.",
  );
  const list = await request.get(`${backend}/api/v1/patients/${id}/memories/`, {
    headers,
  });
  const memory = (
    (await list.json()) as Array<{
      id: string;
      title: string;
      media: Array<{ url: string }>;
    }>
  ).find((row) => row.title === title)!;
  expect(memory.media).toHaveLength(1);
  const mediaUrl = new URL(memory.media[0]!.url, backend).href;
  expect((await request.get(mediaUrl)).status()).toBe(401);
  expect((await request.get(mediaUrl, { headers })).status()).toBe(200);
  const foreign = await professional(request, "caregiver2@example.com");
  expect(
    (
      await request.get(`${backend}/api/v1/patients/${id}/memories/`, {
        headers: foreign,
      })
    ).status(),
  ).toBe(404);
  expect((await request.get(mediaUrl, { headers: foreign })).status()).toBe(
    404,
  );
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Add to routine", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill(`Routine ${title}`);
  await page.getByLabel("Time", { exact: true }).fill("17:43");
  await page
    .getByRole("button", { name: "Save routine item", exact: true })
    .click();
  const saveAnyway = page.getByRole("button", {
    name: "Save anyway",
    exact: true,
  });
  const savedRoutine = page
    .locator("strong")
    .filter({ hasText: `Routine ${title}` });
  await expect(savedRoutine.or(saveAnyway).first()).toBeVisible();
  if (await saveAnyway.isVisible()) await saveAnyway.click();
  await expect(savedRoutine).toBeVisible();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
});

test("Admin password profile and transfer action revoke doctor access without OTP", async ({
  page,
  request,
}) => {
  const headers = await professional(request, "priya@example.com");
  const id = await patientId(request, headers);
  const doctor2 = await professional(request, "doctor2@example.com");
  const doctor2Me = await request.get(`${backend}/api/v1/auth/me/`, {
    headers: doctor2,
  });
  expect(doctor2Me.ok()).toBeTruthy();
  const doctor2User = (await doctor2Me.json()) as { user: { id: string } };
  await page.goto("/admin/");
  await page.getByLabel("Username:", { exact: true }).fill("admin");
  await page.getByLabel("Password:", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Site administration", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/TOTP|one.time password|authenticator/i),
  ).toHaveCount(0);
  await page.goto("/admin/accounts/user/?q=admin");
  await page.getByRole("link", { name: "admin", exact: true }).last().click();
  await expect(page.getByLabel("Username:", { exact: true })).toHaveValue(
    "admin",
  );
  await expect(page.getByText("Password:", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/TOTP|one.time password|authenticator/i),
  ).toHaveCount(0);
  await page.goto("/admin/patients/patientprofile/");
  const deka = await professional(request, "deka@example.com");
  const me = await request.get(`${backend}/api/v1/auth/me/`, { headers: deka });
  expect(me.ok()).toBeTruthy();
  const dekaUser = (await me.json()) as { user: { id: string } };
  async function transfer(doctorId: string) {
    await page.locator(`input[name="_selected_action"][value="${id}"]`).check();
    await page
      .locator('select[name="action"]')
      .first()
      .selectOption("transfer_doctor");
    await page
      .locator('select[name="doctor_id"]')
      .first()
      .selectOption(doctorId);
    await page.getByRole("button", { name: "Go", exact: true }).first().click();
    await expect(
      page.getByText("Doctor assignment transferred", { exact: false }),
    ).toBeVisible();
  }
  await transfer(doctor2User.user.id);
  expect(
    (
      await request.get(`${backend}/api/v1/patients/${id}/`, {
        headers: doctor2,
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await request.get(`${backend}/api/v1/patients/${id}/`, { headers: deka })
    ).status(),
  ).toBe(404);
  await transfer(dekaUser.user.id);
  expect(
    (
      await request.get(`${backend}/api/v1/patients/${id}/`, {
        headers: doctor2,
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await request.get(`${backend}/api/v1/patients/${id}/`, { headers: deka })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
});
