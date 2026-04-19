import { test, expect } from "@playwright/test";

/**
 * Q1 — lightweight browser smoke (tenant host + auth redirect).
 * Requires dev server on port 3000; `*.localhost` should resolve to 127.0.0.1.
 */

test("unauthenticated /admin sends user to login with return URL", async ({
  page,
}) => {
  try {
    await page.goto("/admin/associations/test-assoc/competitions", {
      timeout: 5_000,
      waitUntil: "domcontentloaded",
    });
  } catch {
    test.skip(true, "dev server not running on localhost:3000");
    return;
  }

  const url = page.url();
  const atLogin =
    url.includes("/login") ||
    url.includes("/admin/login") ||
    url.includes("/api/auth/sso");
  expect(atLogin).toBeTruthy();
  if (url.includes("/login") || url.includes("/admin/login")) {
    expect(url).toContain("callbackUrl");
  }
});

test("tenant subdomain home loads (gallery / layout smoke)", async ({ page }) => {
  try {
    await page.goto("http://bha.localhost:3000/", {
      timeout: 5_000,
      waitUntil: "domcontentloaded",
    });
  } catch {
    test.skip(true, "dev server not running or bha.localhost not resolving");
    return;
  }

  expect(page.url()).toContain("bha.localhost");
  const title = await page.title();
  expect(title.length).toBeGreaterThan(0);
});

test("tenant subdomain /news loads", async ({ page }) => {
  try {
    await page.goto("http://bha.localhost:3000/news", {
      timeout: 5_000,
      waitUntil: "domcontentloaded",
    });
  } catch {
    test.skip(true, "dev server not running or bha.localhost not resolving");
    return;
  }

  expect(page.url()).toContain("bha.localhost");
  await expect(page.locator("body")).toBeVisible();
});
