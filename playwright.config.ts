import { defineConfig, devices } from "@playwright/test";

const WEB_URL = process.env.E2E_WEB_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: WEB_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    // Uses the locally installed Chrome so no browser download is needed.
    { name: "desktop", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
  webServer: [
    {
      command: "pnpm --filter @veritas/server dev",
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: "pnpm --filter web dev",
      url: WEB_URL,
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
