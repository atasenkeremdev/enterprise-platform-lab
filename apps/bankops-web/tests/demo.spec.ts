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
  const explanation = page.locator(".demo-checks details[open] .evidence-explainer");
  for (const label of ["Why this matters", "Who should provide it", "Example evidence to provide", "What this demo actually has"]) await expect(explanation.getByText(label, { exact: true })).toBeVisible();
  await expect(explanation.getByRole("link", { name: "RTS 17(1)(d) · Change details", exact: true })).toHaveAttribute("href", "https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj");
  await expect(page.getByText("A gap is missing package information, not a finding of a DORA breach.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "What does each status mean?", exact: true })).toBeVisible();
  await expect(page.getByText("When the source record was created.", { exact: true })).toBeVisible();
  await expect(page.getByText("When it was added to this example package.", { exact: true })).toBeVisible();
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
    await expect(page.locator(".demo-checks details[open] .evidence-provider").filter({ hasText: "Infra" })).toBeVisible();
    await expect(page.locator(".demo-checks details[open]").getByRole("link", { name: "RTS 17(1)(c) · Planning & responsibilities", exact: true })).toHaveAttribute("href", "https://eur-lex.europa.eu/eli/reg_del/2024/1774/oj");
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

test("OpenShift technical excerpts support evidence without inventing an upgrade path or outcome", async ({ page }) => {
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url()); });
  await page.goto("/demo");
  await expect(page.locator(".technical-preview")).toHaveCount(0);
  await page.getByLabel("Choose a synthetic scenario").selectOption("openshift");
  const preview = page.locator(".technical-preview");
  await expect(preview.getByRole("heading", { name: "OpenShift 4.18 → requested target 4.22", exact: true })).toBeVisible();
  await expect(preview.getByText("Synthetic output, not executed commands.", { exact: true })).toBeVisible();
  await expect(preview.getByText("Not validated", { exact: true })).toBeVisible();
  await expect(preview.getByText("Not selected", { exact: true })).toBeVisible();
  const download = await page.request.get("/demo/openshift-technical.synthetic.json");
  expect(download.ok()).toBeTruthy();
  const fixture = await download.json();
  expect(fixture).toEqual(JSON.parse(readFileSync(resolve(process.cwd(), "../../product/dora/examples/openshift-technical.synthetic.json"), "utf8")));
  expect(fixture.plan.requestedTargetMinor).toBe("4.22");
  expect(fixture.plan.resolvedTargetPatch).toBeNull();
  expect(fixture.plan.recommendedUpgradePath).toBeNull();
  expect(fixture.plan.approval).toBe("not_recorded");
  expect(Object.values(fixture.afterChange).every(value => value === null)).toBe(true);
  for (const [button, key] of [["Cluster version", "clusterVersion"], ["Operators", "operators"], ["Machine pools", "machinePools"], ["Nodes", "nodes"]]) {
    const control = preview.getByRole("button", { name: button, exact: true });
    await control.focus();
    await page.keyboard.press("Enter");
    await expect(control).toHaveAttribute("aria-pressed", "true");
    expect(JSON.parse((await preview.locator("pre code").textContent())!)).toEqual(fixture.baseline[key].output);
    await expect(preview.locator(".technical-command code")).toHaveText(fixture.baseline[key].command);
    expect(fixture.baseline[key].command).toMatch(/^oc get /);
  }
  await expect(preview.getByText("No post-change version captured", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Gaps only", exact: true }).click();
  await preview.getByRole("link", { name: "Cluster & infrastructure readiness", exact: true }).click();
  await expect(page).toHaveURL(/#evidence-check-baseline$/);
  await expect(page.getByRole("button", { name: "All checks", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.locator("#evidence-check-baseline summary").click();
  await expect(page.locator("#evidence-check-baseline").getByText("these examples do not close this gap.", { exact: false })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.getByLabel("Choose a synthetic scenario").selectOption("aks");
  await expect(page.locator(".technical-preview")).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(writes).toEqual([]);
});

// SSR must not present working client controls before handlers are attached.
test("server HTML keeps interactive controls disabled until hydration", async ({ request }) => {
  const response = await request.get("/demo");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toMatch(/<select(?=[^>]*id="scenario-select")(?=[^>]*disabled="")[^>]*>/);
  expect(html).toMatch(/<button(?=[^>]*disabled="")[^>]*>Gaps only<\/button>/);
});
