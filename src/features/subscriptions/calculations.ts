import type { Subscription } from "./schema";

const ACTIVE_STATUSES = new Set<Subscription["status"]>(["active", "trial"]);

export function annualizedAmountMinor(subscription: Subscription): number {
  switch (subscription.frequency) {
    case "weekly":
      return subscription.amountMinor * 52;
    case "monthly":
      return subscription.amountMinor * 12;
    case "every_two_months":
      return subscription.amountMinor * 6;
    case "quarterly":
      return subscription.amountMinor * 4;
    case "every_six_months":
      return subscription.amountMinor * 2;
    case "annual":
      return subscription.amountMinor;
    case "custom":
      return subscription.customIntervalDays
        ? Math.round(
            subscription.amountMinor * (365 / subscription.customIntervalDays),
          )
        : 0;
  }
}

export function monthlyEquivalentMinor(subscription: Subscription): number {
  return Math.round(annualizedAmountMinor(subscription) / 12);
}

export function formatMoney(
  amountMinor: number,
  currency = "USD",
  locale = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export function getDashboardSummary(
  subscriptions: Subscription[],
  monthlyBudgetMinor: number,
) {
  const activeSubscriptions = subscriptions.filter((subscription) =>
    ACTIVE_STATUSES.has(subscription.status),
  );
  const annualCostMinor = activeSubscriptions.reduce(
    (total, subscription) => total + annualizedAmountMinor(subscription),
    0,
  );
  const monthlyCostMinor = Math.round(annualCostMinor / 12);
  const potentialSavingsMinor = activeSubscriptions
    .filter((subscription) => subscription.savingsCandidate)
    .reduce(
      (total, subscription) => total + monthlyEquivalentMinor(subscription),
      0,
    );

  return {
    activeCount: activeSubscriptions.length,
    annualCostMinor,
    monthlyCostMinor,
    budgetRemainingMinor: monthlyBudgetMinor - monthlyCostMinor,
    potentialSavingsMinor,
  };
}

export function getPriceIncrease(subscription: Subscription) {
  const previousAmountMinor = subscription.previousAmountMinor;

  if (!previousAmountMinor || subscription.amountMinor <= previousAmountMinor) {
    return null;
  }

  const percentage =
    ((subscription.amountMinor - previousAmountMinor) / previousAmountMinor) *
    100;

  return {
    previousAmountMinor,
    currentAmountMinor: subscription.amountMinor,
    percentage,
  };
}

export function getCategoryTotals(subscriptions: Subscription[]) {
  const totals = new Map<Subscription["category"], number>();

  for (const subscription of subscriptions) {
    if (!ACTIVE_STATUSES.has(subscription.status)) {
      continue;
    }

    const currentTotal = totals.get(subscription.category) ?? 0;
    totals.set(
      subscription.category,
      currentTotal + monthlyEquivalentMinor(subscription),
    );
  }

  return [...totals.entries()]
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((first, second) => second.amountMinor - first.amountMinor);
}
