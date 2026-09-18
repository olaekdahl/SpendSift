import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  persistedSubscriptionSchema,
  type PersistedSubscription,
  type Subscription,
  type SubscriptionCategory,
} from "@/features/subscriptions/schema";
import type { SubscriptionFormInput } from "@/features/subscriptions/form-schema";

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
  "cancellation_url",
  "cancellation_instructions",
  "notes",
  "reminder_lead_days",
  "source",
  "confidence_score",
  "updated_at",
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
  cancellation_url: string | null;
  cancellation_instructions: string | null;
  notes: string | null;
  reminder_lead_days: number;
  source: Subscription["source"];
  confidence_score: number | null;
  updated_at: string;
};

function toSubscription(row: SubscriptionRow): PersistedSubscription {
  const category = row.category as SubscriptionCategory;

  return persistedSubscriptionSchema.parse({
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
    paymentMethodNickname: row.payment_method_nickname ?? undefined,
    website: row.website ?? undefined,
    cancellationUrl: row.cancellation_url ?? undefined,
    cancellationInstructions: row.cancellation_instructions ?? undefined,
    notes: row.notes ?? undefined,
    reminderLeadDays: row.reminder_lead_days,
    source: row.source,
    confidenceScore: row.confidence_score ?? undefined,
    savingsCandidate: false,
    brandColor: categoryColors[category] ?? categoryColors.Other,
    updatedAt: row.updated_at,
  });
}

function toWritePayload(input: SubscriptionFormInput) {
  return {
    merchant_name: input.merchantName,
    display_name: input.displayName,
    category: input.category,
    amount_minor: input.amountMinor,
    currency: input.currency,
    billing_frequency: input.frequency,
    custom_interval_days: input.customIntervalDays ?? null,
    next_billing_date: input.nextBillingDate,
    start_date: input.startDate,
    trial_end_date: input.trialEndDate ?? null,
    status: input.status,
    payment_method_nickname: input.paymentMethodNickname ?? null,
    website: input.website ?? null,
    cancellation_url: input.cancellationUrl ?? null,
    cancellation_instructions: input.cancellationInstructions ?? null,
    notes: input.notes ?? null,
    reminder_lead_days: input.reminderLeadDays,
  };
}

export class SubscriptionWriteConflictError extends Error {
  constructor() {
    super("The subscription changed or is no longer available");
    this.name = "SubscriptionWriteConflictError";
  }
}

export const getSubscriptionsForUser = cache(
  async (userId: string): Promise<PersistedSubscription[]> => {
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

export async function createSubscriptionForUser(
  userId: string,
  input: SubscriptionFormInput,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      ...toWritePayload(input),
    })
    .select(subscriptionColumns)
    .single();

  if (error || !data) {
    throw new Error("Unable to create the subscription");
  }

  return toSubscription(data as unknown as SubscriptionRow);
}

export async function updateSubscriptionForUser(
  userId: string,
  id: string,
  expectedUpdatedAt: string,
  input: SubscriptionFormInput,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update(toWritePayload(input))
    .eq("id", id)
    .eq("user_id", userId)
    .eq("updated_at", expectedUpdatedAt)
    .select(subscriptionColumns)
    .maybeSingle();

  if (error) {
    throw new Error("Unable to update the subscription");
  }
  if (!data) {
    throw new SubscriptionWriteConflictError();
  }

  return toSubscription(data as unknown as SubscriptionRow);
}

export async function archiveSubscriptionForUser(
  userId: string,
  id: string,
  expectedUpdatedAt: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("updated_at", expectedUpdatedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to archive the subscription");
  }
  if (!data) {
    throw new SubscriptionWriteConflictError();
  }
}

export async function deleteSubscriptionForUser(
  userId: string,
  id: string,
  expectedUpdatedAt: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("updated_at", expectedUpdatedAt)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error("Unable to delete the subscription");
  }
  if (!data) {
    throw new SubscriptionWriteConflictError();
  }
}
