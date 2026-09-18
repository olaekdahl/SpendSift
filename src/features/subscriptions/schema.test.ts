import { describe, expect, it } from "vitest";

import { safeExternalUrlSchema } from "./schema";

describe("safeExternalUrlSchema", () => {
  it("accepts an HTTPS URL without embedded credentials", () => {
    expect(safeExternalUrlSchema.parse("https://example.com/account")).toBe(
      "https://example.com/account",
    );
  });

  it.each([
    "http://example.com",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "ftp://example.com/file",
    "//example.com/path",
    "https://user:password@example.com",
    "https://example.com/%0aheader",
    "https://example.com/\u0000path",
    "not a URL",
  ])("rejects unsafe external URL %s", (value) => {
    expect(safeExternalUrlSchema.safeParse(value).success).toBe(false);
  });
});
