import { test, expect } from "@playwright/test";
test("landing page, working CTA, honest preview, and responsive layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Make every changeeasier to explain.");
  await expect(page.getByText("Early product preview. No live evidence collection yet.")).toBeVisible();
  await page.getByRole("link", { name: "Request a demo", exact: true }).click();
  await expect(page).toHaveURL(/#contact$/);
  const demo = page.getByRole("link", { name: "Request a demo on GitHub" });
  await expect(demo).toBeVisible();
  await expect(demo).toHaveAttribute("href", /github.com\/atasenkeremdev\/enterprise-platform-lab\/issues\/new/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  const health = await page.request.get("/healthz");
  expect(health.ok()).toBeTruthy();
  expect((await health.json()).status).toBe("ok");
  expect(errors).toEqual([]);
});
