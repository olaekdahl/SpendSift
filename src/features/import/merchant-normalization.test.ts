import { describe, expect, it } from "vitest";

import {
  merchantDisplayName,
  normalizeMerchant,
} from "./merchant-normalization";

describe("merchant normalization", () => {
  it.each([
    ["NORTHSTAR CINEMA 1038", "NORTHSTAR CINEMA"],
    ["  northstar   cinema 2941 ", "NORTHSTAR CINEMA"],
    ["SQ * CloudNest 98A31", "CLOUDNEST"],
    ["PAYPAL *TEMPO MUSIC REF-8831", "TEMPO MUSIC"],
    ["DEBIT CARD RIVERSIDE MARKET", "RIVERSIDE MARKET"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeMerchant(input)).toBe(expected);
  });

  it("uses an exact user alias before removing noise", () => {
    const aliases = new Map([["CN STORAGE 8831", "CLOUDNEST STORAGE"]]);
    expect(normalizeMerchant("cn storage 8831", aliases)).toBe(
      "CLOUDNEST STORAGE",
    );
  });

  it("creates a bounded display name", () => {
    expect(merchantDisplayName("NORTHSTAR CINEMA")).toBe("Northstar Cinema");
  });
});
