import { test, expect } from "@playwright/test";

test("landing page, honest preview, contact CTA, and responsive layout", async ({ page }) => {
  const errors: string[] = [];
  const failedAssets: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("response", r => { if (r.url().includes("/_next/static/") && !r.ok()) failedAssets.push(r.url()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Infrastructure changes.Clearer evidence.");
  await expect(page.getByText("Early product preview. No live evidence collection yet.")).toBeVisible();
  await expect(page.getByText("Conceptual preview", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText(/github/i);
  await expect(page.locator('a[href*="github.com"]')).toHaveCount(0);
  await page.getByRole("link", { name: "Request a demo", exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  await expect(page.getByRole("heading", { name: "Let’s talk about your evidence workflow." })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  const health = await page.request.get("/healthz");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe("ok");
  expect(errors).toEqual([]);
  expect(failedAssets).toEqual([]);
});

test("keyboard entry and reduced motion remain accessible at narrow width", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  expect(await page.locator(".evidence-visual").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});
