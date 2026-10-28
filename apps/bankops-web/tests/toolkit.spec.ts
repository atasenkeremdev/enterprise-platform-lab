import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import release from "../public/downloads/openshift-maintenance-release.json";

test("free toolkit is discoverable, honest and downloadable without registration", async ({ page }) => {
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("request", r => { if (!["GET", "HEAD"].includes(r.method())) writes.push(r.url()); });
  await page.goto("/");
  await page.getByRole("link", { name: "Get the free toolkit", exact: true }).click();
  await expect(page).toHaveURL(/\/resources\/openshift-maintenance-pack$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("OpenShift Maintenance& Evidence Pack");
  await expect(page.getByText("Free preview, not a live-validated operational release.", { exact: true })).toBeVisible();
  const link = page.getByRole("link", { name: "Download free toolkit", exact: false });
  await expect(link).toHaveAttribute("href", release.url);
  await expect(link).toHaveAttribute("download", release.filename);
  const response = await page.request.get(release.url);
  expect(response.ok()).toBeTruthy();
  const bytes = await response.body();
  expect(bytes.length).toBe(release.bytes);
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(release.sha256);
  const guide = await page.request.get(release.guideUrl);
  expect(guide.ok()).toBeTruthy();
  expect((await guide.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const checksum = await page.request.get(release.checksumUrl);
  expect(checksum.ok()).toBeTruthy();
  expect(await checksum.text()).toContain(release.sha256);
  const folder = mkdtempSync(join(tmpdir(), "bankops-free-toolkit-"));
  try {
    const archive = join(folder, release.filename);
    writeFileSync(archive, bytes, { mode: 0o600 });
    const output = execFileSync("python3", ["scripts/verify-toolkit.py", "--archive", archive], { cwd: process.cwd(), encoding: "utf8", timeout: 30000 });
    expect(output).toContain("12 offline tests passed");
  } finally { rmSync(folder, { recursive: true, force: true }); }
  await page.locator("summary").filter({ hasText: "What does free preview use allow?" }).click();
  await expect(page.getByText("No broader open-source, resale or redistribution licence is granted.", { exact: false })).toBeVisible();
  await expect(page.locator("input,textarea,form,a[href*='github.com']")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(/github/i);
  await page.setViewportSize({ width: 320, height: 800 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
  expect(writes).toEqual([]);
});
