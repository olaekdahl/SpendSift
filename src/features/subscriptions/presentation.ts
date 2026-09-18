import type { Subscription, SubscriptionStatus } from "./schema";

export const frequencyLabels: Record<Subscription["frequency"], string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  every_two_months: "Every two months",
  quarterly: "Quarterly",
  every_six_months: "Every six months",
  annual: "Annual",
  custom: "Custom interval",
};

export const statusLabels: Record<SubscriptionStatus, string> = {
  active: "Active",
  trial: "Trial",
  paused: "Paused",
  cancelled: "Cancelled",
  expired: "Expired",
  needs_review: "Needs review",
};

export function formatDisplayDate(date: string, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
