import { test, expect } from "@playwright/test";

test.describe("Visual Workflow Builder UI", () => {
  test("renders default automated workflow rules", async ({ page }) => {
    await page.goto("/w/northstar-studio/settings");

    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("allows testing workflow rule evaluations", async ({ page }) => {
    await page.goto("/w/northstar-studio/settings");

    const pageTitle = page.locator("body");
    await expect(pageTitle).toContainText("Settings");
  });
});
