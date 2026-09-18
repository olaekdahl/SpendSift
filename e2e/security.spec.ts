import { expect, test } from "@playwright/test";

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
  request,
}) => {
  const privateValues = [
    "NORTHSTAR CINEMA 4821",
    "Everyday card •• 42",
    "https://example.com",
    '"startDate"',
    '"trialEndDate"',
    '"previousAmountMinor"',
    '"paymentMethodNickname"',
  ];

  for (const path of ["/subscriptions", "/savings"]) {
    const response = await request.get(path);
    const body = await response.text();

    expect(response.ok()).toBe(true);
    for (const privateValue of privateValues) {
      expect(body).not.toContain(privateValue);
    }
  }
});

test("renders only a validated HTTPS provider link", async ({ page }) => {
  await page.goto("/subscriptions/sub_northstar");

  const providerLink = page.getByRole("link", { name: "Open example.com" });
  await expect(providerLink).toHaveAttribute("href", "https://example.com");
  await expect(providerLink).toHaveAttribute("target", "_blank");
  await expect(providerLink).toHaveAttribute("rel", "noopener noreferrer");
});
