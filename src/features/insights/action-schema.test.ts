import { describe, expect, it } from "vitest";

import {
  confirmPriceChangeSchema,
  insightFormDataToObject,
  providerCancellationSchema,
  reminderStatusSchema,
} from "./action-schema";

const version = {
  expectedUpdatedAt: "2026-09-17T12:00:00.000Z",
};

describe("insight action schemas", () => {
  it("accepts only a bounded expected price candidate", () => {
    expect(
      confirmPriceChangeSchema.parse({
        subscriptionId: "11111111-1111-4111-8111-111111111111",
        expectedNewAmountMinor: "2199",
        ...version,
      }).expectedNewAmountMinor,
    ).toBe(2199);

    expect(
      confirmPriceChangeSchema.safeParse({
        subscriptionId: "11111111-1111-4111-8111-111111111111",
        expectedNewAmountMinor: "2199",
        userId: "22222222-2222-4222-8222-222222222222",
        ...version,
      }).success,
    ).toBe(false);
  });

  it("limits reminder state to read and dismissed", () => {
    expect(
      reminderStatusSchema.safeParse({
        reminderId: "11111111-1111-4111-8111-111111111111",
        status: "read",
        ...version,
      }).success,
    ).toBe(true);
    expect(
      reminderStatusSchema.safeParse({
        reminderId: "11111111-1111-4111-8111-111111111111",
        status: "pending",
        ...version,
      }).success,
    ).toBe(false);
  });

  it("requires an explicit provider confirmation literal", () => {
    const input = {
      subscriptionId: "11111111-1111-4111-8111-111111111111",
      confirmation: "provider-confirmed",
      ...version,
    };
    expect(providerCancellationSchema.safeParse(input).success).toBe(true);
    expect(
      providerCancellationSchema.safeParse({ ...input, confirmation: "yes" })
        .success,
    ).toBe(false);
  });

  it("preserves duplicate fields so strict validation rejects ambiguity", () => {
    const formData = new FormData();
    formData.append("subscriptionId", "11111111-1111-4111-8111-111111111111");
    formData.append("subscriptionId", "22222222-2222-4222-8222-222222222222");
    formData.set("expectedUpdatedAt", version.expectedUpdatedAt);
    formData.set("expectedNewAmountMinor", "2199");

    expect(
      confirmPriceChangeSchema.safeParse(insightFormDataToObject(formData))
        .success,
    ).toBe(false);
  });
});
