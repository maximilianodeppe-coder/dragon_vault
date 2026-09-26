import { defineConfig } from "@playwright/test";
const baseURL = `http://127.0.0.1:${process.env.PORT || 3000}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  timeout: 30000,
  use: {
    baseURL,
    channel: process.platform === "win32" ? "chrome" : undefined,
    headless: true,
    reducedMotion: "reduce",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node .output/server/index.mjs",
    url: baseURL,
    reuseExistingServer: true,
  },
});
