import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  subscriptionSchema,
  type Subscription,
  type SubscriptionCategory,
} from "@/features/subscriptions/schema";

const categoryColors: Record<SubscriptionCategory, string> = {
  "Video streaming": "#176b57",
  Music: "#7657a8",
  "Cloud storage": "#397a9a",
  "News and publications": "#bd613f",
  Software: "#596273",
  Gaming: "#5573a5",
  Fitness: "#df9a2f",
  "Food delivery memberships": "#9b6546",
  "Shopping memberships": "#a65b79",
  "Security and privacy": "#346f68",
  Other: "#596273",
};

const subscriptionColumns = [
  "id",
  "merchant_name",
  "display_name",
  "category",
  "amount_minor",
  "currency",
  "billing_frequency",
  "custom_interval_days",
  "next_billing_date",
  "start_date",
  "trial_end_date",
  "status",
  "payment_method_nickname",
  "website",
  "source",
  "confidence_score",
].join(",");

type SubscriptionRow = {
  id: string;
  merchant_name: string;
  display_name: string;
  category: string;
  amount_minor: number;
  currency: string;
  billing_frequency: Subscription["frequency"];
  custom_interval_days: number | null;
  next_billing_date: string;
  start_date: string;
  trial_end_date: string | null;
  status: Subscription["status"];
  payment_method_nickname: string | null;
  website: string | null;
  source: Subscription["source"];
  confidence_score: number | null;
};

function toSubscription(row: SubscriptionRow): Subscription {
  const category = row.category as SubscriptionCategory;

  return subscriptionSchema.parse({
    id: row.id,
    merchantName: row.merchant_name,
    displayName: row.display_name,
    category,
    amountMinor: row.amount_minor,
    currency: row.currency,
    frequency: row.billing_frequency,
    customIntervalDays: row.custom_interval_days ?? undefined,
    nextBillingDate: row.next_billing_date,
    startDate: row.start_date,
    trialEndDate: row.trial_end_date ?? undefined,
    status: row.status,
    paymentMethodNickname: row.payment_method_nickname ?? "Not specified",
    website: row.website ?? undefined,
    source: row.source,
    confidenceScore: row.confidence_score ?? undefined,
    savingsCandidate: false,
    brandColor: categoryColors[category] ?? categoryColors.Other,
  });
}

export const getSubscriptionsForUser = cache(
  async (userId: string): Promise<Subscription[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("subscriptions")
      .select(subscriptionColumns)
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("next_billing_date", { ascending: true });

    if (error) {
      throw new Error("Unable to load subscriptions");
    }

    return (data as unknown as SubscriptionRow[]).map(toSubscription);
  },
);

export async function getSubscriptionForUser(userId: string, id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select(subscriptionColumns)
    .eq("user_id", userId)
    .eq("id", id)
    .is("archived_at", null)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to load the subscription");
  }

  return data ? toSubscription(data as unknown as SubscriptionRow) : null;
}
