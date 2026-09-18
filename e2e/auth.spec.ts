import { expect, test } from "@playwright/test";

import {
  cloudNestSubscription,
  createTestAccount,
  deleteTestAccount,
  findConfirmationLink,
  findTestAccountByEmail,
  getAdminClient,
  northstarSubscription,
  signInTestAccount,
} from "./support/supabase";

function tamperSessionCookie(value: string) {
  if (!value.startsWith("base64-")) {
    return `${value.slice(0, -1)}${value.endsWith("a") ? "b" : "a"}`;
  }

  const session = JSON.parse(
    Buffer.from(value.slice("base64-".length), "base64url").toString("utf8"),
  ) as { access_token?: string };
  const accessToken = session.access_token;

  if (!accessToken) {
    throw new Error(
      "Authenticated test cookie did not contain an access token",
    );
  }

  session.access_token = `${accessToken.slice(0, -1)}${accessToken.endsWith("a") ? "b" : "a"}`;
  return `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
}

test("redirects an unauthenticated user to sign in", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("creates and confirms an account through local email", async ({
  page,
}) => {
  const email = `signup-${Date.now()}-${crypto.randomUUID()}@example.test`;
  const password = "SecureSignupPassword123";
  let userId: string | undefined;

  try {
    await page.goto("/auth/sign-up");
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByText("Check your email to confirm the account.", {
        exact: false,
      }),
    ).toBeVisible();

    let confirmationLink: string | null = null;
    await expect
      .poll(async () => {
        confirmationLink = await findConfirmationLink(email);
        return confirmationLink;
      })
      .not.toBeNull();

    await page.goto(confirmationLink!);
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole("heading", { name: "Make SubTrack yours" }),
    ).toBeVisible();

    const account = await findTestAccountByEmail(email);
    expect(account?.email_confirmed_at).toBeTruthy();
    userId = account?.id;
  } finally {
    if (!userId) {
      userId = (await findTestAccountByEmail(email))?.id;
    }
    if (userId) {
      const { error } = await getAdminClient().auth.admin.deleteUser(userId);
      if (error) throw new Error("Unable to remove sign-up test account");
    }
  }
});

test("requires onboarding and saves private preferences", async ({ page }) => {
  const account = await createTestAccount({ onboarded: false });

  try {
    await signInTestAccount(page, account);
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByLabel("Time zone").selectOption("Europe/Stockholm");
    await page.getByLabel("Monthly budget").fill("90.50");
    await page.getByLabel("Monthly savings goal").fill("30.25");
    await page.getByRole("button", { name: "Save and continue" }).click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole("heading", {
        name: "Your subscription picture starts here",
      }),
    ).toBeVisible();

    const admin = getAdminClient();
    const [{ data: profile }, { data: budget }, { data: goal }] =
      await Promise.all([
        admin
          .from("profiles")
          .select("time_zone, onboarding_completed_at")
          .eq("user_id", account.id)
          .single(),
        admin
          .from("budgets")
          .select("monthly_limit_minor")
          .eq("user_id", account.id)
          .single(),
        admin
          .from("savings_goals")
          .select("monthly_target_minor")
          .eq("user_id", account.id)
          .single(),
      ]);

    expect(profile?.time_zone).toBe("Europe/Stockholm");
    expect(profile?.onboarding_completed_at).not.toBeNull();
    expect(budget?.monthly_limit_minor).toBe(9050);
    expect(goal?.monthly_target_minor).toBe(3025);
  } finally {
    await deleteTestAccount(account);
  }
});

test("signs out and prevents session reuse", async ({ page }) => {
  const account = await createTestAccount();

  try {
    await signInTestAccount(page, account);
    await expect(page).toHaveURL(/\/dashboard$/);

    const authCookies = (await page.context().cookies()).filter((cookie) =>
      cookie.name.startsWith("sb-"),
    );
    expect(authCookies.length).toBeGreaterThan(0);
    expect(authCookies.every((cookie) => cookie.httpOnly)).toBe(true);
    expect(authCookies.every((cookie) => cookie.sameSite === "Lax")).toBe(true);

    const protectedResponse = await page.goto("/dashboard");
    expect(protectedResponse?.headers()["cache-control"]).toContain("no-cache");

    await page.getByRole("button", { name: "Sign out" }).first().click();
    await expect(page).toHaveURL(/\/auth\/sign-in$/);

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard$/);
  } finally {
    await deleteTestAccount(account);
  }
});

test("rejects a tampered authentication cookie", async ({ page }) => {
  const account = await createTestAccount();

  try {
    await signInTestAccount(page, account);
    const authCookie = (await page.context().cookies()).find((cookie) =>
      cookie.name.startsWith("sb-"),
    );
    expect(authCookie).toBeTruthy();

    await page.context().clearCookies();
    await page.context().addCookies([
      {
        ...authCookie!,
        value: tamperSessionCookie(authCookie!.value),
      },
    ]);
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard$/);
  } finally {
    await deleteTestAccount(account);
  }
});

test("resets a password through local email without exposing account state", async ({
  page,
}) => {
  const account = await createTestAccount();
  const newPassword = "UpdatedSecurePassword123";

  try {
    await page.goto("/auth/forgot-password");
    await page.getByLabel("Email address").fill(account.email);
    await page.getByRole("button", { name: "Send reset link" }).click();

    await expect(
      page.getByText(
        "If an account matches that email, a password-reset message is on its way.",
      ),
    ).toBeVisible();

    let recoveryLink: string | null = null;
    await expect
      .poll(async () => {
        recoveryLink = await findConfirmationLink(account.email);
        return recoveryLink;
      })
      .not.toBeNull();

    await page.goto(recoveryLink!);
    await expect(page).toHaveURL(/\/auth\/update-password$/);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByLabel("Confirm password").fill(newPassword);
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(
      page.getByText("Your password has been updated.", { exact: false }),
    ).toBeVisible();

    await page.context().clearCookies();
    await signInTestAccount(page, { ...account, password: newPassword });
    await expect(page).toHaveURL(/\/dashboard$/);
  } finally {
    await deleteTestAccount(account);
  }
});

test("does not expose another user's subscription by ID", async ({ page }) => {
  const owner = await createTestAccount({
    subscriptions: [cloudNestSubscription],
  });
  const other = await createTestAccount({
    subscriptions: [northstarSubscription],
  });

  try {
    const { data: ownerSubscription, error } = await getAdminClient()
      .from("subscriptions")
      .select("id")
      .eq("user_id", owner.id)
      .single();
    expect(error).toBeNull();
    expect(ownerSubscription?.id).toBeTruthy();

    await signInTestAccount(page, other);
    await page.goto(`/subscriptions/${ownerSubscription?.id}`);

    await expect(page.getByText("This page could not be found.")).toBeVisible();
  } finally {
    await deleteTestAccount(owner);
    await deleteTestAccount(other);
  }
});
