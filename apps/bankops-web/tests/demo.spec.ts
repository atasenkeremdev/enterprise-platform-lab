import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("public demo keeps the synthetic contract and exposes gaps without approval actions", async ({ page }) => {
  const errors: string[] = [];
  const writes: string[] = [];
  const sourceFetches: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => {
    if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url());
    if (/eur-lex|example-payments|urn:bankops/.test(r.url())) sourceFetches.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the demo", exact: true }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("One change.The evidence around it.");
  await expect(page.getByText("Synthetic data · Read-only prototype", { exact: true })).toBeVisible();
  await expect(page.getByText("This screen does not assess DORA compliance.", { exact: false })).toBeVisible();
  await expect(page.locator(".demo-checks > li")).toHaveCount(5);
  await page.getByRole("button", { name: "Gaps only", exact: true }).click();
  await expect(page.getByRole("button", { name: "Gaps only", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".demo-checks > li")).toHaveCount(4);
  await expect(page.getByRole("status")).toHaveText("Showing 4 of 5 illustrative checks");
  await expect(page.locator(".demo-checks").getByText("Change description", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "All checks", exact: true }).click();
  await page.locator("summary").filter({ hasText: "Change description" }).click();
  await expect(page.getByText("urn:bankops:synthetic:change-record:001", { exact: true })).toBeVisible();
  await expect(page.getByText("Source timestamp", { exact: true })).toBeVisible();
  await expect(page.getByText("Collection timestamp", { exact: true })).toBeVisible();
  await expect(page.getByText("Not ready for approval.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /approve|upload|submit|connect/i })).toHaveCount(0);
  await expect(page.locator('input, textarea, form, a[href*="github.com"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/github/i);
  const download = await page.request.get("/demo/change-evidence.synthetic.json");
  expect(download.ok()).toBeTruthy();
  const record = await download.json();
  expect(record).toEqual(JSON.parse(readFileSync(resolve(process.cwd(), "../../product/dora/examples/change-evidence.synthetic.json"), "utf8")));
  expect(record.synthetic).toBe(true);
  expect(record.status).toBe("draft");
  expect(record.review).toBeUndefined();
  expect(record.implementation).toBeUndefined();
  expect(writes).toEqual([]);
  expect(sourceFetches).toEqual([]);
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

test("demo filters and disclosure support keyboard navigation at 320 pixels", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/demo");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#demo-main$/);
  await page.getByRole("button", { name: "Gaps only", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".demo-checks > li")).toHaveCount(4);
  const risk = page.locator("summary").filter({ hasText: "Risk and fallback plan" });
  await risk.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("A written fallback proposal is not proof that recovery has been tested.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
});

for (const scenario of [
  { id: "aks", title: "AKS platform and node pool upgrade", file: "aks-platform.synthetic.json", evidence: "Platform baseline & upgrade plan", boundary: "Microsoft operates the managed control plane", fallback: "do not assume a Kubernetes version downgrade" },
  { id: "openshift", title: "OpenShift platform upgrade", file: "openshift-platform.synthetic.json", evidence: "Cluster & infrastructure readiness", boundary: "OpenShift nodes follow platform-managed OS lifecycle", fallback: "An OpenShift cluster version rollback is not supported" },
  { id: "rhel", title: "RHEL operating system patching", file: "rhel-platform.synthetic.json", evidence: "OS baseline & patch assessment", boundary: "Infra owns the VM's operating system", fallback: "package downgrade or snapshot recovery is not assumed safe" },
]) {
  test(`${scenario.id} scenario keeps infrastructure ownership, scope and downloaded evidence consistent`, async ({ page }) => {
    const errors: string[] = [];
    const writes: string[] = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("request", r => { if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url()); });
    await page.goto("/demo");
    await expect(page.getByText("Accountable team: Development", { exact: true })).toHaveCount(2);
    await page.getByRole("button", { name: "Gaps only", exact: true }).click();
    await page.getByLabel("Choose a synthetic scenario").selectOption(scenario.id);
    await expect(page.getByRole("heading", { name: scenario.title, exact: true })).toBeVisible();
    await expect(page.getByText("Accountable team: Infra", { exact: true })).toHaveCount(2);
    await expect(page.getByText(scenario.boundary, { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "All checks", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".demo-checks > li")).toHaveCount(6);
    await page.locator("summary").filter({ hasText: scenario.evidence }).click();
    await expect(page.locator(".demo-checks details[open] .check-responsibility").filter({ hasText: "Infra" })).toBeVisible();
    await page.locator("summary").filter({ hasText: "Risk and fallback plan" }).click();
    await expect(page.getByText(scenario.fallback, { exact: false })).toBeVisible();
    await page.getByRole("button", { name: "Gaps only", exact: true }).click();
    await expect(page.locator(".demo-checks > li")).toHaveCount(5);
    const link = page.getByRole("link", { name: "Download synthetic JSON", exact: false });
    await expect(link).toHaveAttribute("href", `/demo/${scenario.file}`);
    const response = await page.request.get(`/demo/${scenario.file}`);
    expect(response.ok()).toBeTruthy();
    const record = await response.json();
    expect(record).toEqual(JSON.parse(readFileSync(resolve(process.cwd(), `../../product/dora/examples/${scenario.file}`), "utf8")));
    expect(record.people.owner).toBe("synthetic-infra-owner");
    expect(record.synthetic).toBe(true);
    expect(record.status).toBe("draft");
    expect(record.review).toBeUndefined();
    expect(record.implementation).toBeUndefined();
    await page.getByLabel("Choose a synthetic scenario").selectOption("application");
    await expect(page.getByRole("heading", { name: "Application image update", exact: true })).toBeVisible();
    await expect(link).toHaveAttribute("href", "/demo/change-evidence.synthetic.json");
    await expect(page.getByText("synthetic-infra-owner", { exact: true })).toHaveCount(0);
    await expect(page.locator(".demo-checks details[open]")).toHaveCount(0);
    await expect(page.locator('input,textarea,form,a[href*="github.com"]')).toHaveCount(0);
    expect(errors).toEqual([]);
    expect(writes).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  });
}
