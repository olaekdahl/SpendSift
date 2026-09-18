import { describe, expect, it } from "vitest";

import { detectDateFormat, importColumnMappingSchema } from "./mapping-schema";

const mapping = {
  dateColumn: "Date",
  descriptionColumn: "Description",
  amountColumn: "Amount",
  debitColumn: null,
  creditColumn: null,
  dateFormat: "iso",
};

describe("import column mapping", () => {
  it("detects ISO dates from the preview", () => {
    expect(detectDateFormat(["2026-06-21", "2026-07-21"])).toBe("iso");
  });

  it("detects month-first dates from the preview", () => {
    expect(detectDateFormat(["6/21/2026", "07/21/2026"])).toBe("month_first");
  });

  it("defaults ambiguous or mixed previews to the visible ISO option", () => {
    expect(detectDateFormat([])).toBe("iso");
    expect(detectDateFormat(["2026-06-21", "7/21/2026"])).toBe("iso");
  });

  it("accepts one signed amount column", () => {
    expect(importColumnMappingSchema.safeParse(mapping).success).toBe(true);
  });

  it("accepts separate debit and credit columns", () => {
    expect(
      importColumnMappingSchema.safeParse({
        ...mapping,
        amountColumn: null,
        debitColumn: "Debit",
        creditColumn: "Credit",
      }).success,
    ).toBe(true);
  });

  it.each([
    { ...mapping, amountColumn: null },
    { ...mapping, debitColumn: "Debit" },
    { ...mapping, descriptionColumn: "Date" },
    { ...mapping, unexpected: "owner" },
  ])("rejects ambiguous, repeated, or unknown mappings", (value) => {
    expect(importColumnMappingSchema.safeParse(value).success).toBe(false);
  });
});
