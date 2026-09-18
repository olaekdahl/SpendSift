import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("opens the demo and shows accurate dashboard totals", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "SubTrack" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Open the fictional demo" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Good morning" }),
  ).toBeVisible();
  await expect(page.getByText("$61.46", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$737.51", { exact: true })).toBeVisible();
  await expect(page.getByText("$23.54", { exact: true }).first()).toBeVisible();
});

test("filters subscriptions and reviews statement suggestions", async ({
  page,
}) => {
  await page.goto("/subscriptions");

  await page
    .getByRole("searchbox", { name: "Search subscriptions" })
    .fill("CloudNest");
  await expect(page.getByText("1 subscription")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /CloudNest 200 GB/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Import", exact: true }).click();
  await page.getByRole("button", { name: "Confirm CloudNest Storage" }).click();
  await page.getByRole("button", { name: "Reject Riverside Market" }).click();

  await expect(page.getByText("2 of 3 reviewed")).toBeVisible();
  await expect(page.getByText("Confirmed")).toBeVisible();
  await expect(page.getByText("Rejected")).toBeVisible();
});

test("updates the savings estimate", async ({ page }) => {
  await page.goto("/savings");

  await expect(page.getByText("$20.99", { exact: true }).first()).toBeVisible();
  await page.getByRole("checkbox", { name: /Northstar Cinema/ }).check();
  await expect(page.getByText("$39.98", { exact: true })).toBeVisible();
  await expect(page.getByText("$479.76 over one year")).toBeVisible();
});

test("has no serious accessibility violations or horizontal overflow", async ({
  page,
}) => {
  for (const path of ["/", "/dashboard", "/subscriptions"]) {
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
});
