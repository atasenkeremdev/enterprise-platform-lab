import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests", retries: 0,
  use: { baseURL: process.env.BANKOPS_TEST_URL || "http://127.0.0.1:3000" },
  projects: [{ name: "desktop", use: { viewport: { width: 1440, height: 1100 } } }, { name: "mobile", use: { viewport: { width: 390, height: 844 }, isMobile: true } }],
});
