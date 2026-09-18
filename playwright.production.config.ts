import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e-production",
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3108",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command:
      "APP_URL=http://localhost:3108 HOSTNAME=127.0.0.1 PORT=3108 node .next/standalone/server.js",
    url: "http://localhost:3108",
    reuseExistingServer: false,
  },
});
