import type { Database } from "@/lib/supabase/database.types";

import { merchantDisplayName } from "./merchant-normalization";
import type { ParsedStatementTransaction } from "./statement-parser";

type BillingFrequency = Database["public"]["Enums"]["billing_frequency"];

export type RecurrenceSuggestion = {
  normalizedMerchant: string;
  displayName: string;
  amountMinor: number;
  currency: string;
  billingFrequency: Exclude<BillingFrequency, "custom">;
  nextBillingDate: string;
  startDate: string;
  confidenceScore: number;
  reasonCode: string;
  reasonSummary: string;
};

const cadences: {
  frequency: RecurrenceSuggestion["billingFrequency"];
  days: number;
  tolerance: number;
  label: string;
  months?: number;
}[] = [
  { frequency: "weekly", days: 7, tolerance: 2, label: "one week" },
  {
    frequency: "monthly",
    days: 30.44,
    tolerance: 5,
    label: "one month",
    months: 1,
  },
  {
    frequency: "every_two_months",
    days: 60.88,
    tolerance: 9,
    label: "two months",
    months: 2,
  },
  {
    frequency: "quarterly",
    days: 91.31,
    tolerance: 14,
    label: "three months",
    months: 3,
  },
  {
    frequency: "every_six_months",
    days: 182.62,
    tolerance: 24,
    label: "six months",
    months: 6,
  },
  {
    frequency: "annual",
    days: 365.25,
    tolerance: 36,
    label: "one year",
    months: 12,
  },
];

function dayDifference(left: string, right: string) {
  return (
    (Date.parse(`${right}T00:00:00Z`) - Date.parse(`${left}T00:00:00Z`)) /
    86_400_000
  );
}

function addCadence(dateString: string, cadence: (typeof cadences)[number]) {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (!cadence.months) {
    date.setUTCDate(date.getUTCDate() + cadence.days);
    return date.toISOString().slice(0, 10);
  }

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + cadence.months;
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

function median(values: number[]) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function detectRecurringCharges(
  transactions: readonly ParsedStatementTransaction[],
) {
  const groups = new Map<string, ParsedStatementTransaction[]>();
  for (const transaction of transactions) {
    if (transaction.amountMinor >= 0) continue;
    const key = `${transaction.normalizedMerchant}\0${transaction.currency}`;
    groups.set(key, [...(groups.get(key) ?? []), transaction]);
  }

  const suggestions: RecurrenceSuggestion[] = [];
  for (const group of groups.values()) {
    const ordered = [...group].sort((left, right) =>
      left.transactionDate.localeCompare(right.transactionDate),
    );
    if (ordered.length < 2) continue;

    const intervals = ordered
      .slice(1)
      .map((transaction, index) =>
        dayDifference(
          ordered[index].transactionDate,
          transaction.transactionDate,
        ),
      );
    const typicalInterval = median(intervals);
    const cadence = cadences
      .map((candidate) => ({
        ...candidate,
        distance: Math.abs(candidate.days - typicalInterval),
      }))
      .filter((candidate) => candidate.distance <= candidate.tolerance)
      .sort((left, right) => left.distance - right.distance)[0];
    if (!cadence) continue;

    const intervalSpread = Math.max(...intervals) - Math.min(...intervals);
    if (intervalSpread > cadence.tolerance) continue;
    const amounts = ordered.map((transaction) =>
      Math.abs(transaction.amountMinor),
    );
    const latestAmount = amounts.at(-1)!;
    const amountSpread = Math.max(...amounts) - Math.min(...amounts);
    const stableAmount = amountSpread === 0;
    const modestChange = amountSpread / Math.max(...amounts) <= 0.2;
    const confidenceScore = Math.min(
      99,
      50 +
        Math.min(ordered.length, 5) * 7 +
        (intervalSpread <= cadence.tolerance ? 14 : 7) +
        (stableAmount ? 10 : modestChange ? 5 : 0),
    );
    const amountReason = stableAmount
      ? "with the same amount"
      : modestChange
        ? "with a modest amount change"
        : "with changing amounts";

    suggestions.push({
      normalizedMerchant: ordered[0].normalizedMerchant,
      displayName: merchantDisplayName(ordered[0].normalizedMerchant),
      amountMinor: latestAmount,
      currency: ordered[0].currency,
      billingFrequency: cadence.frequency,
      nextBillingDate: addCadence(ordered.at(-1)!.transactionDate, cadence),
      startDate: ordered[0].transactionDate,
      confidenceScore,
      reasonCode: `${cadence.frequency.toUpperCase()}_${stableAmount ? "STABLE" : "VARIABLE"}`,
      reasonSummary: `${ordered.length} charges appeared about ${cadence.label} apart ${amountReason}.`,
    });
  }

  return suggestions.sort(
    (left, right) =>
      right.confidenceScore - left.confidenceScore ||
      left.displayName.localeCompare(right.displayName),
  );
}
