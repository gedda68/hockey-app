import { test, expect } from "@playwright/test";

/**
 * Epic K4 — lightweight E2E smoke (requires dev server: `pnpm dev`).
 * Run: `pnpm exec playwright install` once, then `pnpm test:e2e`.
 */
test.describe("Admin entry smoke", () => {
  test("admin login page loads with sign-in form", async ({ page }) => {
    try {
      await page.goto("/admin/login");
    } catch {
      test.skip(true, "dev server not running on localhost:3000");
    }
    await expect(
      page.getByRole("heading", { name: /teams management/i }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/username or email/i)).toBeVisible();
  });
});
