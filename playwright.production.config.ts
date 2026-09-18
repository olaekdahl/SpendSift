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
      "APP_URL=http://localhost:3108 npm run start -- --hostname 127.0.0.1 --port 3108",
    url: "http://localhost:3108",
    reuseExistingServer: false,
  },
});
