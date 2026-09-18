import type { PersistedSubscription } from "./schema";

export type SubscriptionEditorData = Pick<
  PersistedSubscription,
  | "id"
  | "merchantName"
  | "displayName"
  | "category"
  | "amountMinor"
  | "currency"
  | "frequency"
  | "customIntervalDays"
  | "nextBillingDate"
  | "startDate"
  | "trialEndDate"
  | "status"
  | "paymentMethodNickname"
  | "website"
  | "cancellationUrl"
  | "cancellationInstructions"
  | "notes"
  | "reminderLeadDays"
  | "updatedAt"
>;

export function toSubscriptionEditorData(
  subscription: PersistedSubscription,
): SubscriptionEditorData {
  return {
    id: subscription.id,
    merchantName: subscription.merchantName,
    displayName: subscription.displayName,
    category: subscription.category,
    amountMinor: subscription.amountMinor,
    currency: subscription.currency,
    frequency: subscription.frequency,
    customIntervalDays: subscription.customIntervalDays,
    nextBillingDate: subscription.nextBillingDate,
    startDate: subscription.startDate,
    trialEndDate: subscription.trialEndDate,
    status: subscription.status,
    paymentMethodNickname: subscription.paymentMethodNickname,
    website: subscription.website,
    cancellationUrl: subscription.cancellationUrl,
    cancellationInstructions: subscription.cancellationInstructions,
    notes: subscription.notes,
    reminderLeadDays: subscription.reminderLeadDays,
    updatedAt: subscription.updatedAt,
  };
}
