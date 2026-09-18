import { describe, expect, it } from "vitest";

import {
  deleteSubscriptionSchema,
  formatMinorUnitsForSubscriptionInput,
  subscriptionFormSchema,
  updateSubscriptionSchema,
} from "./form-schema";

const validInput = {
  merchantName: "Northstar Cinema",
  displayName: "Northstar Cinema",
  category: "Video streaming",
  amountMinor: "18.99",
  currency: "USD",
  frequency: "monthly",
  customIntervalDays: "",
  nextBillingDate: "2026-10-21",
  startDate: "2026-01-21",
  trialEndDate: "",
  status: "active",
  paymentMethodNickname: "Everyday card",
  website: "https://example.com/account",
  cancellationUrl: "https://example.com/cancel",
  cancellationInstructions: "Open account settings.",
  notes: "Fictional fixture",
  reminderLeadDays: "7",
} as const;

describe("subscription form schemas", () => {
  it("parses money into integer minor units", () => {
    const result = subscriptionFormSchema.parse(validInput);
    expect(result.amountMinor).toBe(1899);
    expect(result.customIntervalDays).toBeUndefined();
  });

  it.each(["0", "-1", "1.234", "1e3", "abc"])(
    "rejects invalid price %s",
    (amountMinor) => {
      expect(
        subscriptionFormSchema.safeParse({ ...validInput, amountMinor })
          .success,
      ).toBe(false);
    },
  );

  it("requires days only for custom billing", () => {
    expect(
      subscriptionFormSchema.safeParse({
        ...validInput,
        frequency: "custom",
      }).success,
    ).toBe(false);
    expect(
      subscriptionFormSchema.safeParse({
        ...validInput,
        frequency: "custom",
        customIntervalDays: "45",
      }).success,
    ).toBe(true);
  });

  it("rejects inconsistent dates", () => {
    expect(
      subscriptionFormSchema.safeParse({
        ...validInput,
        nextBillingDate: "2025-12-31",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown ownership and provenance fields", () => {
    expect(
      subscriptionFormSchema.safeParse({
        ...validInput,
        user_id: "11111111-1111-1111-1111-111111111111",
        source: "statement_import",
      }).success,
    ).toBe(false);
  });

  it("removes React action metadata without removing user fields", async () => {
    const { formDataToObject } = await import("./form-schema");
    const formData = new FormData();
    formData.set("displayName", "Fixture service");
    formData.set("$ACTION_ID_example", "framework-value");
    formData.set("user_id", "attacker-controlled");

    expect(formDataToObject(formData)).toEqual({
      displayName: "Fixture service",
      user_id: "attacker-controlled",
    });
  });

  it("preserves duplicate user fields so strict validation rejects ambiguity", async () => {
    const { formDataToObject } = await import("./form-schema");
    const formData = new FormData();
    for (const [name, value] of Object.entries(validInput)) {
      formData.set(name, value);
    }
    formData.append("amountMinor", "0.01");

    expect(
      subscriptionFormSchema.safeParse(formDataToObject(formData)).success,
    ).toBe(false);
  });

  it("requires a valid concurrency token for updates", () => {
    expect(
      updateSubscriptionSchema.safeParse({
        ...validInput,
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        expectedUpdatedAt: "not-a-timestamp",
      }).success,
    ).toBe(false);
  });

  it("requires explicit local-delete confirmation", () => {
    expect(
      deleteSubscriptionSchema.safeParse({
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        expectedUpdatedAt: "2026-09-17T12:00:00Z",
        confirmation: "cancel",
      }).success,
    ).toBe(false);
  });

  it("formats integer minor units for editing", () => {
    expect(formatMinorUnitsForSubscriptionInput(1899)).toBe("18.99");
  });
});
