import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

import {
  cloudNestSubscription,
  createTestAccount,
  deleteTestAccount,
  findTestAccountByEmail,
  getAdminClient,
  northstarSubscription,
  signInTestAccount,
  type TestAccount,
} from "./support/supabase";

const publicOwnerTables = [
  "profiles",
  "subscriptions",
  "transactions",
  "statement_imports",
  "import_column_mappings",
  "merchant_aliases",
  "import_suggestions",
  "subscription_price_history",
  "reminders",
  "budgets",
  "savings_goals",
  "cancellation_guides",
  "audit_events",
] as const;

async function countOwnerRows(
  table: (typeof publicOwnerTables)[number],
  userId: string,
) {
  const { count, error } = await getAdminClient()
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw new Error(`Unable to inspect ${table}`);
  return count ?? 0;
}

test("creates, edits, and safely renders an owner cancellation guide", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    const admin = getAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", account.id)
      .single();
    await signInTestAccount(page, account);
    await page.goto(`/subscriptions/${subscription!.id}`);
    await page.getByRole("link", { name: "Manage guide" }).click();
    await page
      .getByLabel("Cancellation URL")
      .fill("https://example.test/account/cancel");
    await page.getByLabel("Provider phone").fill("+1 (555) 010-2000");
    await page
      .getByLabel("Instructions")
      .fill("Open account settings and confirm with the provider.");
    await page.getByLabel("Last verified").fill("2026-09-17");
    await page.getByLabel("Private notes").fill("Fictional private note.");
    await page.getByRole("button", { name: "Save guide" }).click();

    await expect(
      page.getByText("Provider phone: +1 (555) 010-2000"),
    ).toBeVisible();
    await expect(
      page.getByText("Fictional private note.", { exact: false }),
    ).toBeVisible();
    const external = page.getByRole("link", {
      name: "Open example.test cancellation page",
    });
    await expect(external).toHaveAttribute(
      "href",
      "https://example.test/account/cancel",
    );
    await expect(external).toHaveAttribute("rel", "noopener noreferrer");

    await page.getByRole("link", { name: "Manage guide" }).click();
    await page.getByLabel("Private notes").fill("Updated private note.");
    await page.getByRole("button", { name: "Save guide" }).click();
    await expect(
      page.getByText("Updated private note.", { exact: false }),
    ).toBeVisible();
  } finally {
    await deleteTestAccount(account);
  }
});

test("does not expose another user's cancellation guide by known ID", async ({
  page,
}) => {
  const owner = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });
  const other = await createTestAccount();

  try {
    const admin = getAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", owner.id)
      .single();
    await admin.from("cancellation_guides").insert({
      user_id: owner.id,
      subscription_id: subscription!.id,
      instructions: "Owner-only private instructions",
    });

    await signInTestAccount(page, other);
    const response = await page.goto(
      `/subscriptions/${subscription!.id}/cancellation`,
    );
    expect(response?.status()).toBe(404);
    await expect(page.getByText("Owner-only private instructions")).toHaveCount(
      0,
    );
  } finally {
    await deleteTestAccount(owner);
    await deleteTestAccount(other);
  }
});

test("exports only the current user through a private fixed-name JSON response", async ({
  page,
}) => {
  const owner = await createTestAccount({
    subscriptions: [northstarSubscription],
  });
  const other = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    await signInTestAccount(page, owner);
    const api = page.context().request;
    const wrongPassword = await api.post("/api/account/export", {
      headers: {
        Origin: "http://localhost:3107",
        "Content-Type": "application/json",
      },
      data: { password: "WrongPassword123" },
    });
    expect(wrongPassword.status()).toBe(401);

    await page.goto("/settings");
    const exportForm = page
      .locator("form")
      .filter({ hasText: "Download data" });
    await exportForm.getByLabel("Current password").fill(owner.password);
    const [download, response] = await Promise.all([
      page.waitForEvent("download"),
      page.waitForResponse(
        (candidate) =>
          candidate.url().endsWith("/api/account/export") &&
          candidate.request().method() === "POST",
      ),
      exportForm.getByRole("button", { name: "Download JSON" }).click(),
    ]);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["content-disposition"]).toBe(
      'attachment; filename="subtrack-export.json"',
    );
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(download.suggestedFilename()).toBe("subtrack-export.json");
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    const body = await readFile(downloadPath!, "utf8");
    const data = JSON.parse(body) as Record<string, unknown>;
    expect(data.schema_version).toBe(1);
    expect(body).toContain("Northstar Cinema");
    expect(body).toContain(owner.email);
    expect(body).not.toContain("CloudNest 200 GB");
    expect(body).not.toContain(other.email);
    expect(body).not.toContain(owner.password);
    expect(body).not.toMatch(
      /access_token|refresh_token|file_sha256|transaction_sha256/i,
    );
  } finally {
    await deleteTestAccount(owner);
    await deleteTestAccount(other);
  }
});

test("deletes the current account, expires cookies, and preserves another user", async ({
  page,
}) => {
  let owner: TestAccount | null = await createTestAccount({
    subscriptions: [northstarSubscription],
  });
  const other = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });

  try {
    await signInTestAccount(page, owner);
    const api = page.context().request;
    const wrongPassword = await api.delete("/api/account", {
      headers: {
        Origin: "http://localhost:3107",
        "Content-Type": "application/json",
      },
      data: { password: "WrongPassword123", confirmation: "DELETE MY ACCOUNT" },
    });
    expect(wrongPassword.status()).toBe(401);
    expect(await findTestAccountByEmail(owner.email)).not.toBeNull();

    await page.goto("/settings");
    const deleteForm = page
      .locator("form")
      .filter({ hasText: "Delete account" });
    await deleteForm.getByLabel("Current password").fill(owner.password);
    await deleteForm
      .getByLabel("Type DELETE MY ACCOUNT")
      .fill("DELETE MY ACCOUNT");
    const [response] = await Promise.all([
      page.waitForResponse(
        (candidate) =>
          candidate.url().endsWith("/api/account") &&
          candidate.request().method() === "DELETE",
      ),
      deleteForm.getByRole("button", { name: "Delete account" }).click(),
    ]);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");

    const deletedId = owner.id;
    const deletedEmail = owner.email;
    owner = null;
    expect(await findTestAccountByEmail(deletedEmail)).toBeNull();
    expect(
      (await page.context().cookies()).filter((cookie) =>
        cookie.name.startsWith("sb-"),
      ),
    ).toEqual([]);
    expect(await findTestAccountByEmail(other.email)).not.toBeNull();

    for (const table of publicOwnerTables) {
      expect(await countOwnerRows(table, deletedId)).toBe(0);
    }
    expect(await countOwnerRows("subscriptions", other.id)).toBe(1);

    await expect(page).toHaveURL(/\/$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard$/);
  } finally {
    if (owner) await deleteTestAccount(owner);
    await deleteTestAccount(other);
  }
});

test("rejects unauthenticated, cross-origin, oversized, and malformed account requests", async ({
  page,
  request,
}) => {
  const anonymous = await request.post("/api/account/export", {
    headers: {
      Origin: "http://localhost:3107",
      "Content-Type": "application/json",
    },
    data: { password: "NoSessionPassword123" },
  });
  expect(anonymous.status()).toBe(401);

  const account = await createTestAccount();
  try {
    await signInTestAccount(page, account);
    const api = page.context().request;
    const crossOrigin = await api.post("/api/account/export", {
      headers: {
        Origin: "https://attacker.example",
        "Content-Type": "application/json",
      },
      data: { password: account.password },
    });
    expect(crossOrigin.status()).toBe(403);

    const oversized = await api.post("/api/account/export", {
      headers: {
        Origin: "http://localhost:3107",
        "Content-Type": "application/json",
      },
      data: Buffer.alloc(4097, 0x61),
    });
    expect(oversized.status()).toBe(413);

    const malformed = await api.delete("/api/account", {
      headers: {
        Origin: "http://localhost:3107",
        "Content-Type": "application/json",
      },
      data: { password: account.password, confirmation: "delete" },
    });
    expect(malformed.status()).toBe(400);
    expect(await findTestAccountByEmail(account.email)).not.toBeNull();
  } finally {
    await deleteTestAccount(account);
  }
});

test("rate limits repeated account reauthentication attempts", async ({
  page,
}, testInfo) => {
  const account = await createTestAccount();
  const headers = {
    Origin: "http://localhost:3107",
    "Content-Type": "application/json",
    "X-Forwarded-For":
      testInfo.project.name === "chromium" ? "198.51.100.61" : "198.51.100.62",
  };

  try {
    await signInTestAccount(page, account);
    const api = page.context().request;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await api.post("/api/account/export", {
        headers,
        data: { password: "WrongPassword123" },
      });
      expect(response.status()).toBe(401);
    }

    const limited = await api.post("/api/account/export", {
      headers,
      data: { password: "WrongPassword123" },
    });
    expect(limited.status()).toBe(429);
    expect(await limited.json()).toEqual({ ok: false, code: "RATE_LIMITED" });
  } finally {
    await deleteTestAccount(account);
  }
});

test("privacy and settings controls are accessible without horizontal overflow", async ({
  page,
}) => {
  await page.goto("/privacy");
  let results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);

  const account = await createTestAccount();
  try {
    await signInTestAccount(page, account);
    await page.goto("/settings");
    results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  } finally {
    await deleteTestAccount(account);
  }
});
