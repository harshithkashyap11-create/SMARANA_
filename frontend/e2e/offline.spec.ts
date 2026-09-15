import { expect, test } from "@playwright/test";
test("patient app shell remains available offline", async ({ page, context }) => {
  await page.goto("/"); await page.waitForLoadState("networkidle");
  await context.setOffline(true); await page.reload();
  await expect(page.locator("body")).toContainText("Smārana");
  await context.setOffline(false);
});
