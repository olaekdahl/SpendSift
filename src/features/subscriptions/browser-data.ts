import { monthlyEquivalentMinor } from "./calculations";
import type { Subscription } from "./schema";

export type SubscriptionListItem = Pick<
  Subscription,
  | "id"
  | "displayName"
  | "category"
  | "amountMinor"
  | "currency"
  | "frequency"
  | "nextBillingDate"
  | "status"
  | "brandColor"
> & {
  monthlyAmountMinor: number;
};

export type SavingsPlanItem = Pick<
  Subscription,
  "id" | "displayName" | "category" | "currency" | "brandColor"
> & {
  monthlyAmountMinor: number;
  selectedByDefault: boolean;
};

export function toSubscriptionListItems(
  subscriptions: readonly Subscription[],
): SubscriptionListItem[] {
  return subscriptions.map((subscription) => ({
    id: subscription.id,
    displayName: subscription.displayName,
    category: subscription.category,
    amountMinor: subscription.amountMinor,
    currency: subscription.currency,
    frequency: subscription.frequency,
    nextBillingDate: subscription.nextBillingDate,
    status: subscription.status,
    brandColor: subscription.brandColor,
    monthlyAmountMinor: monthlyEquivalentMinor(subscription),
  }));
}

export function toSavingsPlanItems(
  subscriptions: readonly Subscription[],
): SavingsPlanItem[] {
  return subscriptions
    .filter(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trial",
    )
    .map((subscription) => ({
      id: subscription.id,
      displayName: subscription.displayName,
      category: subscription.category,
      currency: subscription.currency,
      brandColor: subscription.brandColor,
      monthlyAmountMinor: monthlyEquivalentMinor(subscription),
      selectedByDefault: subscription.savingsCandidate,
    }));
}
