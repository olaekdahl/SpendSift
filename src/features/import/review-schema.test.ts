import { describe, expect, it } from "vitest";

import {
  approveImportSuggestionSchema,
  editImportSuggestionSchema,
  importFormDataToObject,
} from "./review-schema";

const validEdit = {
  suggestionId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  importId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  expectedUpdatedAt: "2026-09-17T12:00:00.000Z",
  displayName: "Northstar Cinema",
  amountMinor: "18.99",
  billingFrequency: "monthly",
  nextBillingDate: "2026-10-21",
  startDate: "2026-06-21",
};

describe("import review schemas", () => {
  it("converts an edited amount to integer minor units", () => {
    const result = editImportSuggestionSchema.parse(validEdit);
    expect(result.amountMinor).toBe(1899);
  });

  it("rejects an impossible date relationship", () => {
    expect(
      editImportSuggestionSchema.safeParse({
        ...validEdit,
        nextBillingDate: "2026-01-01",
      }).success,
    ).toBe(false);
  });

  it("rejects protected fields and unsupported custom cadence", () => {
    expect(
      editImportSuggestionSchema.safeParse({
        ...validEdit,
        userId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      }).success,
    ).toBe(false);
    expect(
      editImportSuggestionSchema.safeParse({
        ...validEdit,
        billingFrequency: "custom",
      }).success,
    ).toBe(false);
  });

  it("preserves duplicate user fields so strict validation rejects them", () => {
    const formData = new FormData();
    for (const [name, value] of Object.entries(validEdit)) {
      formData.append(name, value);
    }
    formData.append("displayName", "Injected duplicate");

    expect(
      editImportSuggestionSchema.safeParse(importFormDataToObject(formData))
        .success,
    ).toBe(false);
  });

  it("filters only React Action metadata", () => {
    const formData = new FormData();
    formData.set("$ACTION_ID_test", "framework metadata");
    formData.set("suggestionId", validEdit.suggestionId);
    formData.set("importId", validEdit.importId);
    formData.set("expectedUpdatedAt", validEdit.expectedUpdatedAt);
    formData.set("category", "Other");
    expect(
      approveImportSuggestionSchema.safeParse(importFormDataToObject(formData))
        .success,
    ).toBe(true);
  });
});
