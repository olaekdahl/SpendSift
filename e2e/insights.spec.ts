import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

import {
  cloudNestSubscription,
  createTestAccount,
  deleteTestAccount,
  getAdminClient,
  northstarSubscription,
  signInTestAccount,
} from "./support/supabase";

function fingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function addLinkedCharge(
  userId: string,
  subscriptionId: string,
  amountMinor: number,
) {
  const admin = getAdminClient();
  const importId = crypto.randomUUID();
  const seed = `${userId}:${subscriptionId}:${amountMinor}:${importId}`;
  const { error: importError } = await admin.from("statement_imports").insert({
    id: importId,
    user_id: userId,
    status: "completed",
    file_sha256: fingerprint(`file:${seed}`),
    file_size_bytes: 128,
    row_count: 1,
    accepted_count: 1,
    completed_at: new Date().toISOString(),
  });
  const { error: transactionError } = await admin.from("transactions").insert({
    user_id: userId,
    statement_import_id: importId,
    subscription_id: subscriptionId,
    transaction_date: new Date().toISOString().slice(0, 10),
    normalized_merchant: "PRIVATE RAW MERCHANT 8842",
    amount_minor: -amountMinor,
    currency: "USD",
    transaction_sha256: fingerprint(`transaction:${seed}`),
  });
  if (importError || transactionError) {
    throw new Error("Unable to prepare linked insight fixtures");
  }
}

test("confirms a database-derived price change without exposing source data", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [northstarSubscription],
  });

  try {
    const admin = getAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", account.id)
      .single();
    await addLinkedCharge(account.id, subscription!.id, 2199);

    await signInTestAccount(page, account);
    const response = await page.goto("/dashboard");
    const body = await response?.text();
    expect(body).not.toContain("PRIVATE RAW MERCHANT 8842");
    expect(body).not.toContain(account.id);

    await expect(page.getByText("15.8% increase")).toBeVisible();
    await page.getByRole("button", { name: "Confirm price" }).click();
    await expect(
      page.getByRole("button", { name: "Confirm price" }),
    ).toHaveCount(0);

    const [{ data: current }, { data: history }, { data: reminder }] =
      await Promise.all([
        admin
          .from("subscriptions")
          .select("amount_minor")
          .eq("id", subscription!.id)
          .single(),
        admin
          .from("subscription_price_history")
          .select(
            "previous_amount_minor, new_amount_minor, percentage_basis_points",
          )
          .eq("subscription_id", subscription!.id)
          .single(),
        admin
          .from("reminders")
          .select("id")
          .eq("subscription_id", subscription!.id)
          .eq("reminder_type", "price_increase")
          .eq("status", "pending"),
      ]);
    expect(current?.amount_minor).toBe(2199);
    expect(history).toEqual({
      previous_amount_minor: 1899,
      new_amount_minor: 2199,
      percentage_basis_points: 1580,
    });
    expect(reminder).toEqual([]);
  } finally {
    await deleteTestAccount(account);
  }
});

test("rejects a stale price confirmation", async ({ page }) => {
  const account = await createTestAccount({
    subscriptions: [northstarSubscription],
  });

  try {
    const admin = getAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", account.id)
      .single();
    await addLinkedCharge(account.id, subscription!.id, 2199);
    await signInTestAccount(page, account);
    await page.goto("/dashboard");

    await admin
      .from("subscriptions")
      .update({ notes: "Newer fictional server value" })
      .eq("id", subscription!.id);
    await page.getByRole("button", { name: "Confirm price" }).click();

    await expect(
      page.getByText("This insight changed in another request.", {
        exact: false,
      }),
    ).toBeVisible();
    const { count } = await admin
      .from("subscription_price_history")
      .select("id", { count: "exact", head: true })
      .eq("subscription_id", subscription!.id);
    expect(count).toBe(0);
  } finally {
    await deleteTestAccount(account);
  }
});

test("confirms a meaningful price decrease", async ({ page }) => {
  const account = await createTestAccount({
    subscriptions: [northstarSubscription],
  });

  try {
    const admin = getAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", account.id)
      .single();
    await addLinkedCharge(account.id, subscription!.id, 1599);
    await signInTestAccount(page, account);
    await page.goto("/dashboard");

    await expect(page.getByText("15.8% decrease")).toBeVisible();
    await page.getByRole("button", { name: "Confirm price" }).click();
    await expect(page.getByText("15.8% decrease")).toHaveCount(0);

    const { data: history } = await admin
      .from("subscription_price_history")
      .select("new_amount_minor, percentage_basis_points")
      .eq("subscription_id", subscription!.id)
      .single();
    expect(history).toEqual({
      new_amount_minor: 1599,
      percentage_basis_points: -1580,
    });
  } finally {
    await deleteTestAccount(account);
  }
});

test("uses the configured threshold for advisory overlaps and potential savings", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [
      {
        ...northstarSubscription,
        display_name: "Stream Basic",
        amount_minor: 500,
      },
      {
        ...northstarSubscription,
        display_name: "Stream Plus",
        merchant_name: "STREAM PLUS",
        amount_minor: 1000,
      },
      {
        ...northstarSubscription,
        display_name: "Stream Max",
        merchant_name: "STREAM MAX",
        amount_minor: 1200,
      },
    ],
  });

  try {
    await signInTestAccount(page, account);
    await page.goto("/dashboard");
    await expect(page.getByText("Possible overlaps")).toBeVisible();
    await expect(page.getByText(/may serve similar needs/)).toBeVisible();

    await page.goto("/savings");
    await expect(
      page.getByRole("status", { name: "Potential monthly savings total" }),
    ).toHaveText("$22.00");

    await page.goto("/settings");
    await page.getByLabel("Overlap alert threshold").selectOption("4");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(page.getByText("Preferences saved.")).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByText("Possible overlaps")).toHaveCount(0);

    const { data: profile } = await getAdminClient()
      .from("profiles")
      .select("overlap_threshold")
      .eq("user_id", account.id)
      .single();
    expect(profile?.overlap_threshold).toBe(4);

    await page.goto("/settings");
    await page
      .locator('input[name="locale"]')
      .evaluate((input: HTMLInputElement) => {
        input.value = "invalid locale";
      });
    await page.getByLabel("Overlap alert threshold").selectOption("3");
    await page.getByRole("button", { name: "Save preferences" }).click();
    await expect(
      page.getByText("Check the highlighted preferences."),
    ).toBeVisible();
    const { data: unchangedProfile } = await getAdminClient()
      .from("profiles")
      .select("overlap_threshold")
      .eq("user_id", account.id)
      .single();
    expect(unchangedProfile?.overlap_threshold).toBe(4);
  } finally {
    await deleteTestAccount(account);
  }
});

test("counts savings only after explicit provider cancellation confirmation", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    await signInTestAccount(page, account);
    await page.goto("/savings");
    await expect(
      page
        .getByRole("heading", { name: "Realized savings" })
        .locator("..")
        .getByText("$0.00"),
    ).toBeVisible();

    await page.getByText("Record provider-confirmed cancellation").click();
    await page
      .getByRole("checkbox", { name: /provider, not SubTrack, has cancelled/ })
      .check();
    await page.getByRole("button", { name: "Record cancellation" }).click();

    await expect(
      page
        .getByRole("heading", { name: "Realized savings" })
        .locator("..")
        .getByText("$2.99"),
    ).toBeVisible();
    await expect(page.getByText("CloudNest 200 GB")).toHaveCount(0);

    const { data: subscription } = await getAdminClient()
      .from("subscriptions")
      .select("status, provider_cancelled_at, realized_monthly_minor")
      .eq("user_id", account.id)
      .single();
    expect(subscription?.status).toBe("cancelled");
    expect(subscription?.provider_cancelled_at).not.toBeNull();
    expect(subscription?.realized_monthly_minor).toBe(299);
  } finally {
    await deleteTestAccount(account);
  }
});

test("lists and marks an owner in-app reminder without external delivery", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    await signInTestAccount(page, account);
    await page.goto("/calendar");
    await expect(
      page.getByRole("heading", { name: "In-app reminders" }),
    ).toBeVisible();
    await expect(
      page.getByText("No email, SMS, or push delivery is enabled."),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Dismiss CloudNest 200 GB" })
      .click();
    await expect(
      page.getByRole("button", { name: "Dismiss CloudNest 200 GB" }),
    ).toHaveCount(0);

    const { data: reminder } = await getAdminClient()
      .from("reminders")
      .select("status, read_at")
      .eq("user_id", account.id)
      .single();
    expect(reminder?.status).toBe("dismissed");
    expect(reminder?.read_at).toBeNull();
  } finally {
    await deleteTestAccount(account);
  }
});
