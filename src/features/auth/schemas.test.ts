import { describe, expect, it } from "vitest";

import {
  emailSchema,
  getSafeNextPath,
  signUpSchema,
  strongPasswordSchema,
} from "./schemas";

describe("authentication schemas", () => {
  it("normalizes email addresses", () => {
    expect(emailSchema.parse("  USER@Example.COM ")).toBe("user@example.com");
  });

  it.each(["short", "alllowercase123", "ALLUPPERCASE123", "NoNumbersHere"])(
    "rejects weak password %s",
    (password) => {
      expect(strongPasswordSchema.safeParse(password).success).toBe(false);
    },
  );

  it("rejects mismatched confirmation", () => {
    expect(
      signUpSchema.safeParse({
        email: "user@example.test",
        password: "SecurePassword123",
        confirmPassword: "DifferentPassword123",
      }).success,
    ).toBe(false);
  });

  it.each(["https://evil.example", "//evil.example", "\\evil.example", null])(
    "replaces unsafe continuation %s",
    (value) => {
      expect(getSafeNextPath(value)).toBe("/dashboard");
    },
  );

  it("accepts an internal continuation path", () => {
    expect(getSafeNextPath("/subscriptions/sub_123")).toBe(
      "/subscriptions/sub_123",
    );
  });
});
