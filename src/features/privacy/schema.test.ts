import { describe, expect, it } from "vitest";

import { deleteAccountSchema, exportAccountSchema } from "./schema";

describe("account privacy schemas", () => {
  it("accepts a bounded export password", () => {
    expect(
      exportAccountSchema.safeParse({ password: "SecureTestPassword123" })
        .success,
    ).toBe(true);
  });

  it.each(["", "x".repeat(129)])(
    "rejects invalid password length",
    (password) => {
      expect(exportAccountSchema.safeParse({ password }).success).toBe(false);
    },
  );

  it("requires the exact destructive confirmation phrase", () => {
    const input = {
      password: "SecureTestPassword123",
      confirmation: "DELETE MY ACCOUNT",
    };
    expect(deleteAccountSchema.safeParse(input).success).toBe(true);
    expect(
      deleteAccountSchema.safeParse({ ...input, confirmation: "delete" })
        .success,
    ).toBe(false);
  });

  it("rejects unknown fields", () => {
    expect(
      exportAccountSchema.safeParse({
        password: "SecureTestPassword123",
        userId: "11111111-1111-4111-8111-111111111111",
      }).success,
    ).toBe(false);
  });
});
