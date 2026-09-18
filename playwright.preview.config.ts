import { defineConfig, devices } from "@playwright/test";

const previewUrl = process.env.PREVIEW_URL;

if (!previewUrl?.startsWith("https://")) {
  throw new Error("PREVIEW_URL must be the deployed HTTPS origin");
}

export default defineConfig({
  testDir: "./e2e-preview",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: "list",
  use: {
    baseURL: previewUrl,
    screenshot: "off",
    trace: "off",
    video: "off",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
      grepInvert: /two fictional users/,
    },
  ],
});
