import { describe, expect, it } from "vitest";

import type { PersistedSubscription } from "@/features/subscriptions/schema";

import {
  calculateBasisPoints,
  calculateBudgetState,
  dateWithinDays,
  detectCategoryOverlaps,
  detectPriceChanges,
  type LinkedTransaction,
} from "./calculations";

function subscription(
  overrides: Partial<PersistedSubscription> = {},
): PersistedSubscription {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    merchantName: "NORTHSTAR",
    displayName: "Northstar",
    category: "Video streaming",
    amountMinor: 1000,
    currency: "USD",
    frequency: "monthly",
    nextBillingDate: "2026-10-31",
    startDate: "2026-01-31",
    status: "active",
    reminderLeadDays: 7,
    source: "manual",
    savingsCandidate: false,
    brandColor: "#176b57",
    updatedAt: "2026-09-17T12:00:00.000Z",
    ...overrides,
  };
}

function transaction(
  overrides: Partial<LinkedTransaction> = {},
): LinkedTransaction {
  return {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    subscriptionId: "11111111-1111-4111-8111-111111111111",
    transactionDate: "2026-09-01",
    createdAt: "2026-09-01T12:00:00.000Z",
    amountMinor: -1200,
    currency: "USD",
    ...overrides,
  };
}

describe("insight calculations", () => {
  it.each([
    [1000, 1200, 2000],
    [1000, 800, -2000],
    [999, 1049, 501],
  ])(
    "calculates integer basis points for %i to %i",
    (previous, next, expected) => {
      expect(calculateBasisPoints(previous, next)).toBe(expected);
    },
  );

  it("detects an increase and a decrease from the latest linked charge", () => {
    const subscriptions = [
      subscription(),
      subscription({
        id: "22222222-2222-4222-8222-222222222222",
        displayName: "CloudNest",
        amountMinor: 1000,
      }),
    ];
    const transactions = [
      transaction({ transactionDate: "2026-08-01", amountMinor: -1100 }),
      transaction(),
      transaction({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        subscriptionId: "22222222-2222-4222-8222-222222222222",
        amountMinor: -800,
      }),
    ];

    expect(detectPriceChanges(subscriptions, transactions)).toEqual([
      expect.objectContaining({ direction: "increase", newAmountMinor: 1200 }),
      expect.objectContaining({ direction: "decrease", newAmountMinor: 800 }),
    ]);
  });

  it("ignores rounding noise, small percentages, credits, currencies, and confirmed sources", () => {
    expect(
      detectPriceChanges(
        [subscription()],
        [transaction({ amountMinor: -1049 })],
      ),
    ).toEqual([]);
    expect(
      detectPriceChanges(
        [subscription({ amountMinor: 100_000 })],
        [transaction({ amountMinor: -100_500 })],
      ),
    ).toEqual([]);
    expect(
      detectPriceChanges(
        [subscription()],
        [transaction({ amountMinor: 1200 })],
      ),
    ).toEqual([]);
    expect(
      detectPriceChanges([subscription()], [transaction({ currency: "EUR" })]),
    ).toEqual([]);
    expect(
      detectPriceChanges(
        [subscription()],
        [transaction()],
        new Set(["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]),
      ),
    ).toEqual([]);
    expect(
      detectPriceChanges(
        [subscription({ amountMinor: 1 })],
        [transaction({ amountMinor: -1_000_000 })],
      ),
    ).toEqual([]);
  });

  it("does not fall back to an older charge after the latest source is confirmed", () => {
    const latest = transaction({
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      transactionDate: "2026-09-02",
      createdAt: "2026-09-02T12:00:00.000Z",
    });
    const older = transaction({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      transactionDate: "2026-08-02",
      createdAt: "2026-08-02T12:00:00.000Z",
      amountMinor: -800,
    });
    expect(
      detectPriceChanges(
        [subscription()],
        [older, latest],
        new Set([latest.id]),
      ),
    ).toEqual([]);
  });

  it("uses creation order to match database ordering for same-day charges", () => {
    const earlier = transaction({
      id: "ffffffff-ffff-4fff-8fff-ffffffffffff",
      createdAt: "2026-09-01T10:00:00.000Z",
      amountMinor: -1100,
    });
    const later = transaction({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      createdAt: "2026-09-01T11:00:00.000Z",
      amountMinor: -1200,
    });
    expect(detectPriceChanges([subscription()], [earlier, later])[0]).toEqual(
      expect.objectContaining({ newAmountMinor: 1200 }),
    );
  });

  it("finds configurable category overlaps and excludes the cheapest plan", () => {
    const subscriptions = [
      subscription({ id: "a", displayName: "Basic", amountMinor: 500 }),
      subscription({ id: "b", displayName: "Plus", amountMinor: 1000 }),
      subscription({
        id: "c",
        displayName: "Annual",
        amountMinor: 12000,
        frequency: "annual",
      }),
    ];
    const [overlap] = detectCategoryOverlaps(subscriptions, 3);

    expect(overlap.category).toBe("Video streaming");
    expect(overlap.candidateIds).toEqual(["b", "c"]);
    expect(overlap.potentialSavingsMinor).toBe(2000);
    expect(detectCategoryOverlaps(subscriptions, 4)).toEqual([]);
  });

  it("excludes inactive and uncategorized services from overlap claims", () => {
    expect(
      detectCategoryOverlaps(
        [
          subscription({ id: "a", category: "Other" }),
          subscription({ id: "b", category: "Other" }),
          subscription({ id: "c", status: "cancelled" }),
          subscription({ id: "d" }),
        ],
        2,
      ),
    ).toEqual([]);
  });

  it("does not combine currencies into one overlap or savings total", () => {
    expect(
      detectCategoryOverlaps(
        [
          subscription({ id: "usd" }),
          subscription({ id: "eur", currency: "EUR" }),
        ],
        2,
      ),
    ).toEqual([]);
  });

  it.each([
    [5000, null, "not_set", null, null],
    [5000, 10000, "on_track", 5000, 50],
    [8500, 10000, "near", 1500, 85],
    [12000, 10000, "over", -2000, 120],
    [100, 0, "over", -100, 100],
  ])(
    "calculates the %s budget state",
    (cost, limit, status, remaining, percentage) => {
      expect(calculateBudgetState(cost, limit)).toEqual({
        status,
        remainingMinor: remaining,
        percentage,
      });
    },
  );

  it("uses inclusive UTC calendar dates across month and leap-year boundaries", () => {
    expect(dateWithinDays("2028-02-29", "2028-02-28", 1)).toBe(true);
    expect(dateWithinDays("2026-03-01", "2026-01-31", 29)).toBe(true);
    expect(dateWithinDays("2026-03-02", "2026-01-31", 29)).toBe(false);
  });
});
