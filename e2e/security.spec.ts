import { expect, test } from "@playwright/test";

import {
  createTestAccount,
  deleteTestAccount,
  northstarSubscription,
  signInTestAccount,
} from "./support/supabase";

test("sets baseline browser security headers", async ({ request }) => {
  const response = await request.get("/");
  const headers = response.headers();
  const contentSecurityPolicy = headers["content-security-policy"];

  expect(response.ok()).toBe(true);
  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
  expect(headers["cross-origin-resource-policy"]).toBe("same-origin");
  expect(contentSecurityPolicy).toContain("default-src 'self'");
  expect(contentSecurityPolicy).toContain("object-src 'none'");
  expect(contentSecurityPolicy).toContain("base-uri 'self'");
  expect(contentSecurityPolicy).toContain("form-action 'self'");
  expect(contentSecurityPolicy).toContain("frame-ancestors 'none'");
  expect(contentSecurityPolicy).toContain("frame-src 'none'");
  expect(contentSecurityPolicy).toContain("script-src-attr 'none'");
});

test("does not serialize unused subscription fields to list clients", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [northstarSubscription],
  });
  const privateValues = [
    "NORTHSTAR CINEMA 4821",
    "Everyday card •• 42",
    "https://example.com",
    '"startDate"',
    '"trialEndDate"',
    '"previousAmountMinor"',
    '"paymentMethodNickname"',
  ];

  try {
    await signInTestAccount(page, account);

    for (const path of ["/subscriptions", "/savings"]) {
      const response = await page.goto(path);
      const body = await response?.text();

      expect(response?.ok()).toBe(true);
      for (const privateValue of privateValues) {
        expect(body).not.toContain(privateValue);
      }
    }
  } finally {
    await deleteTestAccount(account);
  }
});

test("renders only a validated HTTPS provider link", async ({ page }) => {
  const account = await createTestAccount({
    subscriptions: [northstarSubscription],
  });

  try {
    await signInTestAccount(page, account);
    const admin = (await import("./support/supabase")).getAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", account.id)
      .single();

    expect(subscription?.id).toBeTruthy();
    await page.goto(`/subscriptions/${subscription?.id}`);

    const providerLink = page.getByRole("link", { name: "Open example.com" });
    await expect(providerLink).toHaveAttribute("href", "https://example.com");
    await expect(providerLink).toHaveAttribute("target", "_blank");
    await expect(providerLink).toHaveAttribute("rel", "noopener noreferrer");
  } finally {
    await deleteTestAccount(account);
  }
});

test("does not serialize protected fields to the subscription editor", async ({
  page,
}) => {
  const account = await createTestAccount({
    subscriptions: [northstarSubscription],
  });

  try {
    await signInTestAccount(page, account);
    const admin = (await import("./support/supabase")).getAdminClient();
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("id")
      .eq("user_id", account.id)
      .single();
    const response = await page.goto(`/subscriptions/${subscription!.id}/edit`);
    const body = await response?.text();

    expect(response?.ok()).toBe(true);
    expect(body).not.toContain(account.id);
    expect(body).not.toContain('"source"');
    expect(body).not.toContain('"sourceImportId"');
    expect(body).not.toContain('"confidenceScore"');
    expect(body).not.toContain('"createdAt"');
  } finally {
    await deleteTestAccount(account);
  }
});
