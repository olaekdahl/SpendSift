import { monthlyEquivalentMinor } from "@/features/subscriptions/calculations";
import type { PersistedSubscription } from "@/features/subscriptions/schema";

export const PRICE_CHANGE_MINIMUM_MINOR = 50;
export const PRICE_CHANGE_MINIMUM_BASIS_POINTS = 200;
export const PRICE_CHANGE_MAXIMUM_BASIS_POINTS = 500_000;

export type LinkedTransaction = {
  id: string;
  subscriptionId: string;
  transactionDate: string;
  createdAt: string;
  amountMinor: number;
  currency: string;
};

export type PriceChangeCandidate = {
  subscriptionId: string;
  displayName: string;
  previousAmountMinor: number;
  newAmountMinor: number;
  currency: string;
  percentageBasisPoints: number;
  direction: "increase" | "decrease";
  transactionDate: string;
  expectedUpdatedAt: string;
};

export type CategoryOverlap = {
  category: PersistedSubscription["category"];
  currency: string;
  subscriptions: {
    id: string;
    displayName: string;
    monthlyAmountMinor: number;
    currency: string;
  }[];
  potentialSavingsMinor: number;
  candidateIds: string[];
};

export function calculateBasisPoints(
  previousAmountMinor: number,
  newAmountMinor: number,
) {
  if (previousAmountMinor <= 0 || newAmountMinor <= 0) return 0;
  return Math.round(
    ((newAmountMinor - previousAmountMinor) * 10_000) / previousAmountMinor,
  );
}

export function detectPriceChanges(
  subscriptions: readonly PersistedSubscription[],
  transactions: readonly LinkedTransaction[],
  confirmedSourceTransactionIds: ReadonlySet<string> = new Set(),
) {
  const latestBySubscription = new Map<string, LinkedTransaction>();
  for (const transaction of transactions) {
    if (transaction.amountMinor >= 0) {
      continue;
    }
    const current = latestBySubscription.get(transaction.subscriptionId);
    if (
      !current ||
      transaction.transactionDate > current.transactionDate ||
      (transaction.transactionDate === current.transactionDate &&
        (transaction.createdAt > current.createdAt ||
          (transaction.createdAt === current.createdAt &&
            transaction.id > current.id)))
    ) {
      latestBySubscription.set(transaction.subscriptionId, transaction);
    }
  }

  return subscriptions.flatMap((subscription): PriceChangeCandidate[] => {
    const transaction = latestBySubscription.get(subscription.id);
    if (
      !transaction ||
      confirmedSourceTransactionIds.has(transaction.id) ||
      transaction.currency !== subscription.currency
    ) {
      return [];
    }

    const newAmountMinor = Math.abs(transaction.amountMinor);
    const difference = newAmountMinor - subscription.amountMinor;
    const percentageBasisPoints = calculateBasisPoints(
      subscription.amountMinor,
      newAmountMinor,
    );
    if (
      Math.abs(difference) < PRICE_CHANGE_MINIMUM_MINOR ||
      Math.abs(percentageBasisPoints) < PRICE_CHANGE_MINIMUM_BASIS_POINTS ||
      percentageBasisPoints > PRICE_CHANGE_MAXIMUM_BASIS_POINTS
    ) {
      return [];
    }

    return [
      {
        subscriptionId: subscription.id,
        displayName: subscription.displayName,
        previousAmountMinor: subscription.amountMinor,
        newAmountMinor,
        currency: subscription.currency,
        percentageBasisPoints,
        direction: difference > 0 ? "increase" : "decrease",
        transactionDate: transaction.transactionDate,
        expectedUpdatedAt: subscription.updatedAt,
      },
    ];
  });
}

export function detectCategoryOverlaps(
  subscriptions: readonly PersistedSubscription[],
  threshold: number,
) {
  const safeThreshold = Math.min(5, Math.max(2, Math.trunc(threshold)));
  const groups = new Map<string, PersistedSubscription[]>();

  for (const subscription of subscriptions) {
    if (
      subscription.archivedAt ||
      !["active", "trial"].includes(subscription.status) ||
      subscription.category === "Other"
    ) {
      continue;
    }
    const groupKey = `${subscription.category}\0${subscription.currency}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), subscription]);
  }

  const overlaps: CategoryOverlap[] = [];
  for (const group of groups.values()) {
    if (group.length < safeThreshold) continue;
    const ordered = [...group].sort(
      (left, right) =>
        monthlyEquivalentMinor(left) - monthlyEquivalentMinor(right) ||
        left.id.localeCompare(right.id),
    );
    const candidates = ordered.slice(1);
    overlaps.push({
      category: ordered[0].category,
      currency: ordered[0].currency,
      subscriptions: ordered.map((subscription) => ({
        id: subscription.id,
        displayName: subscription.displayName,
        monthlyAmountMinor: monthlyEquivalentMinor(subscription),
        currency: subscription.currency,
      })),
      candidateIds: candidates.map((subscription) => subscription.id),
      potentialSavingsMinor: candidates.reduce(
        (total, subscription) => total + monthlyEquivalentMinor(subscription),
        0,
      ),
    });
  }

  return overlaps.sort(
    (left, right) =>
      right.potentialSavingsMinor - left.potentialSavingsMinor ||
      left.category.localeCompare(right.category),
  );
}

export function calculateBudgetState(
  monthlyCostMinor: number,
  monthlyLimitMinor: number | null,
) {
  if (monthlyLimitMinor === null) {
    return {
      status: "not_set" as const,
      remainingMinor: null,
      percentage: null,
    };
  }

  const remainingMinor = monthlyLimitMinor - monthlyCostMinor;
  const percentage =
    monthlyLimitMinor === 0
      ? monthlyCostMinor === 0
        ? 0
        : 100
      : Math.round((monthlyCostMinor * 100) / monthlyLimitMinor);
  return {
    status:
      remainingMinor < 0
        ? ("over" as const)
        : percentage >= 80
          ? ("near" as const)
          : ("on_track" as const),
    remainingMinor,
    percentage,
  };
}

export function dateWithinDays(
  date: string,
  startDate: string,
  horizonDays: number,
) {
  const value = Date.parse(`${date}T12:00:00Z`);
  const start = Date.parse(`${startDate}T12:00:00Z`);
  const end = start + horizonDays * 86_400_000;
  return value >= start && value <= end;
}
