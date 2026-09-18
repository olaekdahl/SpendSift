import { describe, expect, it } from "vitest";

import {
  cancellationFormDataToObject,
  cancellationGuideSchema,
} from "./schema";

const validGuide = {
  subscriptionId: "11111111-1111-4111-8111-111111111111",
  expectedGuideUpdatedAt: "",
  cancellationUrl: "https://example.test/account/cancel",
  phoneNumber: "+1 (555) 010-2000",
  instructions: "Open settings and contact the provider.",
  verifiedAt: "2026-09-17",
  userNotes: "Fictional note.",
};

describe("cancellationGuideSchema", () => {
  it("normalizes a complete owner guide", () => {
    expect(cancellationGuideSchema.parse(validGuide)).toEqual({
      ...validGuide,
      expectedGuideUpdatedAt: undefined,
    });
  });

  it.each([
    "http://example.test/cancel",
    "javascript:alert(1)",
    "https://user:password@example.test",
    "https://example.test/%0aheader",
  ])("rejects unsafe guide URL %s", (cancellationUrl) => {
    expect(
      cancellationGuideSchema.safeParse({ ...validGuide, cancellationUrl })
        .success,
    ).toBe(false);
  });

  it("rejects invalid phones, controls, oversized notes, and unknown fields", () => {
    expect(
      cancellationGuideSchema.safeParse({
        ...validGuide,
        phoneNumber: "call-provider",
      }).success,
    ).toBe(false);
    expect(
      cancellationGuideSchema.safeParse({
        ...validGuide,
        instructions: "unsafe\u0000text",
      }).success,
    ).toBe(false);
    expect(
      cancellationGuideSchema.safeParse({
        ...validGuide,
        userNotes: "x".repeat(4001),
      }).success,
    ).toBe(false);
    expect(
      cancellationGuideSchema.safeParse({ ...validGuide, userId: "forged" })
        .success,
    ).toBe(false);
  });

  it("rejects implausible and future verification dates", () => {
    expect(
      cancellationGuideSchema.safeParse({
        ...validGuide,
        verifiedAt: "1999-12-31",
      }).success,
    ).toBe(false);
    expect(
      cancellationGuideSchema.safeParse({
        ...validGuide,
        verifiedAt: "2999-01-01",
      }).success,
    ).toBe(false);
  });

  it("preserves duplicate fields so strict validation rejects ambiguity", () => {
    const formData = new FormData();
    for (const [name, value] of Object.entries(validGuide)) {
      formData.append(name, value);
    }
    formData.append("subscriptionId", "22222222-2222-4222-8222-222222222222");

    expect(
      cancellationGuideSchema.safeParse(cancellationFormDataToObject(formData))
        .success,
    ).toBe(false);
  });

  it("allows all optional fields to be cleared to delete the guide", () => {
    expect(
      cancellationGuideSchema.safeParse({
        subscriptionId: validGuide.subscriptionId,
        expectedGuideUpdatedAt: "2026-09-17T12:00:00.000Z",
        cancellationUrl: "",
        phoneNumber: "",
        instructions: "",
        verifiedAt: "",
        userNotes: "",
      }).success,
    ).toBe(true);
  });
});
