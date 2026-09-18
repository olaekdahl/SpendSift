import { describe, expect, it } from "vitest";

import { toSavingsPlanItems, toSubscriptionListItems } from "./browser-data";
import { demoSubscriptions } from "./demo-data";

const privateModelFields = [
  "merchantName",
  "paymentMethodNickname",
  "website",
  "source",
  "previousAmountMinor",
  "savingsCandidate",
] as const;

describe("subscription browser data", () => {
  it("returns the exact field allowlist for subscription list items", () => {
    const [item] = toSubscriptionListItems(demoSubscriptions);

    expect(Object.keys(item).sort()).toEqual(
      [
        "amountMinor",
        "brandColor",
        "category",
        "currency",
        "displayName",
        "frequency",
        "id",
        "monthlyAmountMinor",
        "nextBillingDate",
        "status",
      ].sort(),
    );

    for (const field of privateModelFields) {
      expect(item).not.toHaveProperty(field);
    }
  });

  it("returns only active and trial plans with a minimal savings contract", () => {
    const items = toSavingsPlanItems(demoSubscriptions);

    expect(items).toHaveLength(6);
    expect(Object.keys(items[0]).sort()).toEqual(
      [
        "brandColor",
        "category",
        "currency",
        "displayName",
        "id",
        "monthlyAmountMinor",
        "selectedByDefault",
        "updatedAt",
      ].sort(),
    );
  });
});
