import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const previewWarning =
  "Preview environment. Email verification is temporarily disabled. Do not enter real financial information.";

async function registerAndOnboard(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-up");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/onboarding$/);
  await expect(page.getByText(previewWarning)).toBeVisible();
  await page.getByLabel("Time zone").selectOption("Europe/Stockholm");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function deleteCurrentAccount(
  page: Page,
  email: string,
  password: string,
) {
  await page.goto("/settings");

  if (page.url().includes("/auth/sign-in")) {
    await signIn(page, email, password);
  }

  const origin = process.env.PREVIEW_URL!;
  const response = await page
    .context()
    .request.delete(`${origin}/api/account`, {
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
      },
      data: { password, confirmation: "DELETE MY ACCOUNT" },
    });
  expect(response.status()).toBe(200);
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
}

async function createFictionalSubscription(page: Page) {
  await page.goto("/subscriptions/new");
  await page.getByLabel("Display name").fill("Preview Isolation Service");
  await page.getByLabel("Merchant name").fill("PREVIEW ISOLATION SERVICE");
  await page.getByLabel("Category").selectOption("Software");
  await page.getByLabel("Price").fill("12.34");
  await page.getByLabel("Billing frequency").selectOption("monthly");
  await page.getByLabel("Start date").fill("2026-09-01");
  await page.getByLabel("Next billing date").fill("2026-10-01");
  await page
    .getByLabel("Notes")
    .fill("Fictional live deployment verification only");
  await page.getByRole("button", { name: "Add subscription" }).click();
  await expect(
    page.getByRole("heading", { name: "Preview Isolation Service" }),
  ).toBeVisible();

  const match = new URL(page.url()).pathname.match(
    /^\/subscriptions\/([0-9a-f-]+)$/,
  );
  expect(match?.[1]).toBeTruthy();
  return match![1];
}

test("serves the secure fictional-data preview without mobile overflow", async ({
  page,
}) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  expect(page.url()).toMatch(/^https:\/\//);
  await expect(page.getByText(previewWarning)).toBeVisible();

  const headers = response!.headers();
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-powered-by"]).toBeUndefined();

  const stylesheetPath = await page
    .locator('link[rel="stylesheet"]')
    .first()
    .getAttribute("href");
  expect(stylesheetPath).toBeTruthy();
  const stylesheet = await page.request.get(stylesheetPath!);
  expect(stylesheet.status()).toBe(200);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);

  const source = await response!.text();
  expect(source).not.toMatch(/sb_secret_|service_role|SUPABASE_SERVICE_ROLE/i);
});

test("password reset does not expose whether a fictional account exists", async ({
  page,
}) => {
  await page.goto("/auth/forgot-password");
  await page
    .getByLabel("Email address")
    .fill(`preview-reset-${crypto.randomUUID()}@example.test`);
  await page.getByRole("button", { name: "Send reset link" }).click();

  await expect(
    page.getByText(
      "If an account matches that email, a password-reset message is on its way.",
    ),
  ).toBeVisible();
});

test("two fictional users remain isolated and delete their accounts", async ({
  browser,
  page: ownerPage,
}) => {
  const runId = `${Date.now()}-${crypto.randomUUID()}`;
  const ownerEmail = `preview-owner-${runId}@example.test`;
  const otherEmail = `preview-other-${runId}@example.test`;
  const ownerPassword = `Owner-${crypto.randomUUID()}-Aa1`;
  const otherPassword = `Other-${crypto.randomUUID()}-Aa1`;
  const otherContext: BrowserContext = await browser.newContext({
    baseURL: process.env.PREVIEW_URL,
  });
  const otherPage = await otherContext.newPage();
  let ownerExists = false;
  let otherExists = false;

  try {
    await registerAndOnboard(ownerPage, ownerEmail, ownerPassword);
    ownerExists = true;

    const protectedResponse = await ownerPage.goto("/dashboard");
    expect(protectedResponse?.headers()["cache-control"]).toContain("private");
    expect(protectedResponse?.headers()["cache-control"]).toContain("no-store");

    const authCookies = (await ownerPage.context().cookies()).filter((cookie) =>
      cookie.name.startsWith("sb-"),
    );
    expect(authCookies.length).toBeGreaterThan(0);
    expect(authCookies.every((cookie) => cookie.httpOnly)).toBe(true);
    expect(authCookies.every((cookie) => cookie.secure)).toBe(true);
    expect(authCookies.every((cookie) => cookie.sameSite === "Lax")).toBe(true);

    const ownerSubscriptionId = await createFictionalSubscription(ownerPage);
    await ownerPage.reload();
    await expect(
      ownerPage.getByRole("heading", { name: "Preview Isolation Service" }),
    ).toBeVisible();

    await ownerPage.getByRole("button", { name: "Sign out" }).first().click();
    await expect(ownerPage).toHaveURL(/\/auth\/sign-in$/);
    await ownerPage.goto("/dashboard");
    await expect(ownerPage).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard$/);

    await registerAndOnboard(otherPage, otherEmail, otherPassword);
    otherExists = true;
    await otherPage.goto(`/subscriptions/${ownerSubscriptionId}`);
    await expect(
      otherPage.getByText("This page could not be found."),
    ).toBeVisible();

    await deleteCurrentAccount(otherPage, otherEmail, otherPassword);
    otherExists = false;
    await otherPage.goto("/dashboard");
    await expect(otherPage).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard$/);

    await signIn(ownerPage, ownerEmail, ownerPassword);
    await ownerPage.goto(`/subscriptions/${ownerSubscriptionId}`);
    await expect(
      ownerPage.getByRole("heading", { name: "Preview Isolation Service" }),
    ).toBeVisible();

    await deleteCurrentAccount(ownerPage, ownerEmail, ownerPassword);
    ownerExists = false;
    await ownerPage.goto("/dashboard");
    await expect(ownerPage).toHaveURL(/\/auth\/sign-in\?next=%2Fdashboard$/);
  } finally {
    if (otherExists) {
      await deleteCurrentAccount(otherPage, otherEmail, otherPassword).catch(
        () => undefined,
      );
    }
    if (ownerExists) {
      await deleteCurrentAccount(ownerPage, ownerEmail, ownerPassword).catch(
        () => undefined,
      );
    }
    await otherContext.close();
  }
});
