import { expect, test } from "@playwright/test";

import {
  cloudNestSubscription,
  createTestAccount,
  deleteTestAccount,
  getAdminClient,
  northstarSubscription,
  signInTestAccount,
} from "./support/supabase";

async function fillSubscriptionForm(page: import("@playwright/test").Page) {
  await page.getByLabel("Display name").fill("Harbor Fitness");
  await page.getByLabel("Merchant name").fill("HARBOR FITNESS MEMBERSHIP");
  await page.getByLabel("Category").selectOption("Fitness");
  await page.getByLabel("Status").selectOption("active");
  await page.getByLabel("Price").fill("24.95");
  await page.getByLabel("Billing frequency").selectOption("monthly");
  await page.getByLabel("Start date").fill("2026-09-01");
  await page.getByLabel("Next billing date").fill("2026-10-01");
  await page.getByLabel("Reminder lead time").fill("5");
  await page.getByLabel("Payment method nickname").fill("Everyday card");
  await page.getByLabel("Service website").fill("https://example.com/account");
  await page
    .getByLabel("Cancellation URL")
    .fill("https://example.com/account/cancel");
  await page
    .getByLabel("Cancellation instructions")
    .fill("Open account settings and confirm with the provider.");
  await page.getByLabel("Notes").fill("Fictional Playwright subscription");
}

test("creates, edits, cancels, and archives a subscription", async ({
  page,
}) => {
  const account = await createTestAccount();

  try {
    await signInTestAccount(page, account);
    await page.goto("/subscriptions/new");
    await fillSubscriptionForm(page);
    await page.getByRole("button", { name: "Add subscription" }).click();

    await expect(
      page.getByRole("heading", { name: "Harbor Fitness" }),
    ).toBeVisible();
    await expect(page.getByText("$24.95", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Open example.com cancellation page" }),
    ).toHaveAttribute("href", "https://example.com/account/cancel");

    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByLabel("Price").fill("29.95");
    await page.getByLabel("Status").selectOption("cancelled");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText("$29.95", { exact: true })).toBeVisible();
    await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        "Cancellation is complete only when the provider confirms it.",
        {
          exact: false,
        },
      ),
    ).toBeVisible();

    const { data: record } = await getAdminClient()
      .from("subscriptions")
      .select("id, archived_at")
      .eq("user_id", account.id)
      .eq("display_name", "Harbor Fitness")
      .single();
    expect(record?.archived_at).toBeNull();

    await page.getByRole("button", { name: "Archive local record" }).click();
    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByText("Harbor Fitness")).toHaveCount(0);

    const { data: archived } = await getAdminClient()
      .from("subscriptions")
      .select("archived_at")
      .eq("id", record!.id)
      .single();
    expect(archived?.archived_at).not.toBeNull();
  } finally {
    await deleteTestAccount(account);
  }
});

test("deletes only the confirmed local record", async ({ page }) => {
  const account = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    await signInTestAccount(page, account);
    const { data: record } = await getAdminClient()
      .from("subscriptions")
      .select("id")
      .eq("user_id", account.id)
      .single();

    await page.goto(`/subscriptions/${record!.id}`);
    await page.getByRole("button", { name: "Delete local record" }).click();
    await page
      .getByRole("checkbox", { name: /does not cancel the service/ })
      .check();
    await page
      .locator("form")
      .filter({ hasText: "I understand this deletes only" })
      .getByRole("button", { name: "Delete local record" })
      .click();

    await expect(page).toHaveURL(/\/subscriptions$/);
    const { data } = await getAdminClient()
      .from("subscriptions")
      .select("id")
      .eq("id", record!.id);
    expect(data).toEqual([]);
  } finally {
    await deleteTestAccount(account);
  }
});

test("does not allow one user to edit another user's subscription", async ({
  page,
}) => {
  const owner = await createTestAccount({
    subscriptions: [northstarSubscription],
  });
  const other = await createTestAccount();

  try {
    const { data: record } = await getAdminClient()
      .from("subscriptions")
      .select("id")
      .eq("user_id", owner.id)
      .single();

    await signInTestAccount(page, other);
    await page.goto(`/subscriptions/${record!.id}/edit`);
    await expect(page.getByText("This page could not be found.")).toBeVisible();
  } finally {
    await deleteTestAccount(owner);
    await deleteTestAccount(other);
  }
});

test("does not overwrite a newer subscription update", async ({ page }) => {
  const account = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    await signInTestAccount(page, account);
    const admin = getAdminClient();
    const { data: record } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", account.id)
      .single();

    await page.goto(`/subscriptions/${record!.id}/edit`);
    await admin
      .from("subscriptions")
      .update({ display_name: "Newer server value" })
      .eq("id", record!.id);

    await page.getByLabel("Display name").fill("Stale browser value");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByText("This subscription changed in another request.", {
        exact: false,
      }),
    ).toBeVisible();

    const { data: current } = await admin
      .from("subscriptions")
      .select("display_name")
      .eq("id", record!.id)
      .single();
    expect(current?.display_name).toBe("Newer server value");
  } finally {
    await deleteTestAccount(account);
  }
});
