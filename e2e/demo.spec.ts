import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import {
  cloudNestSubscription,
  createTestAccount,
  deleteTestAccount,
  northstarSubscription,
  signInTestAccount,
} from "./support/supabase";

test("opens the public site and protects the private dashboard", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "SubTrack" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create your account" }),
  ).toBeVisible();
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard$/);
});

test("filters subscriptions and opens the statement workspace", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    await signInTestAccount(page, account);
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.goto("/subscriptions");

    await page
      .getByRole("searchbox", { name: "Search subscriptions" })
      .fill("CloudNest");
    await expect(page.getByText("1 subscription")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /CloudNest 200 GB/ }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Import", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Choose a fictional CSV statement" }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Sample CSV" })).toBeVisible();
  } finally {
    await deleteTestAccount(account);
  }
});

test("updates the savings estimate", async ({ page }) => {
  const account = await createTestAccount({
    subscriptions: [northstarSubscription],
  });

  try {
    await signInTestAccount(page, account);
    await page.goto("/savings");

    await expect(
      page.getByText("$0.00", { exact: true }).first(),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: /Northstar Cinema/ }).check();
    await expect(
      page.getByRole("status", { name: "Potential monthly savings total" }),
    ).toHaveText("$18.99");
    await expect(page.getByText("$227.88 over one year")).toBeVisible();
  } finally {
    await deleteTestAccount(account);
  }
});

test("has no serious accessibility violations or horizontal overflow", async ({
  page,
}) => {
  for (const path of ["/", "/auth/sign-in", "/auth/sign-up"]) {
    await page.goto(path);

    const accessibilityResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();

    expect(accessibilityResults.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }

  const account = await createTestAccount({
    subscriptions: [northstarSubscription],
  });

  try {
    await signInTestAccount(page, account);

    for (const path of [
      "/dashboard",
      "/subscriptions",
      "/import",
      "/calendar",
      "/savings",
      "/settings",
    ]) {
      await page.goto(path);
      const accessibilityResults = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      expect(accessibilityResults.violations).toEqual([]);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
    }
  } finally {
    await deleteTestAccount(account);
  }
});
