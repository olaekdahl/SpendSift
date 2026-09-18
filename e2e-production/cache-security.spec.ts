import { expect, test } from "@playwright/test";

import {
  cloudNestSubscription,
  createTestAccount,
  deleteTestAccount,
  northstarSubscription,
  signInTestAccount,
} from "../e2e/support/supabase";

test("protects authenticated production responses from shared caching", async ({
  browser,
}) => {
  const firstAccount = await createTestAccount({
    subscriptions: [northstarSubscription],
  });
  const secondAccount = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });
  const firstContext = await browser.newContext();
  const secondContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  const secondPage = await secondContext.newPage();

  try {
    await signInTestAccount(firstPage, firstAccount);
    await signInTestAccount(secondPage, secondAccount);
    const [firstResponse, secondResponse] = await Promise.all([
      firstPage.goto("/dashboard"),
      secondPage.goto("/dashboard"),
    ]);

    for (const response of [firstResponse, secondResponse]) {
      const cacheControl = response?.headers()["cache-control"] ?? "";
      expect(cacheControl).toContain("private");
      expect(cacheControl).toContain("no-store");
      expect(response?.headers()["strict-transport-security"]).toBe(
        "max-age=31536000",
      );
      expect(response?.headers()["x-powered-by"]).toBeUndefined();
    }

    await expect(firstPage.getByText("Northstar Cinema")).toBeVisible();
    await expect(firstPage.getByText("CloudNest 200 GB")).toHaveCount(0);
    await expect(secondPage.getByText("CloudNest 200 GB")).toBeVisible();
    await expect(secondPage.getByText("Northstar Cinema")).toHaveCount(0);
  } finally {
    await firstContext.close();
    await secondContext.close();
    await deleteTestAccount(firstAccount);
    await deleteTestAccount(secondAccount);
  }
});
