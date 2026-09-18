import { describe, expect, it } from "vitest";

import { importColumnMappingSchema } from "./mapping-schema";

const mapping = {
  dateColumn: "Date",
  descriptionColumn: "Description",
  amountColumn: "Amount",
  debitColumn: null,
  creditColumn: null,
  dateFormat: "iso",
};

describe("import column mapping", () => {
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
