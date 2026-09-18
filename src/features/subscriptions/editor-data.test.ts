import { describe, expect, it } from "vitest";

import { persistedSubscriptionSchema } from "./schema";
import { toSubscriptionEditorData } from "./editor-data";

describe("subscription editor browser data", () => {
  it("omits ownership, provenance, confidence, and audit-only values", () => {
    const subscription = persistedSubscriptionSchema.parse({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      merchantName: "Fixture merchant",
      displayName: "Fixture service",
      category: "Software",
      amountMinor: 1299,
      currency: "USD",
      frequency: "monthly",
      nextBillingDate: "2026-10-01",
      startDate: "2026-01-01",
      status: "active",
      paymentMethodNickname: "Everyday card",
      source: "manual",
      confidenceScore: 91,
      savingsCandidate: false,
      brandColor: "#596273",
      updatedAt: "2026-09-17T12:00:00Z",
    });

    const result = toSubscriptionEditorData(subscription);

    expect(result).not.toHaveProperty("source");
    expect(result).not.toHaveProperty("confidenceScore");
    expect(result).not.toHaveProperty("savingsCandidate");
    expect(result).not.toHaveProperty("brandColor");
    expect(result).not.toHaveProperty("userId");
  });
});
