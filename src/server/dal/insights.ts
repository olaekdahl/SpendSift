import "server-only";

import { detectPriceChanges } from "@/features/insights/calculations";
import type { ReminderNotification } from "@/features/reminders/notification-service";
import type { PersistedSubscription } from "@/features/subscriptions/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class InsightWriteConflictError extends Error {
  constructor() {
    super("The insight changed or is no longer available");
    this.name = "InsightWriteConflictError";
  }
}

export async function getPriceChangeCandidatesForUser(
  userId: string,
  subscriptions: readonly PersistedSubscription[],
) {
  const supabase = await createSupabaseServerClient();
  const [transactionsResult, historyResult] = await Promise.all([
    supabase
      .from("transactions")
      .select(
        "id, subscription_id, transaction_date, created_at, amount_minor, currency",
      )
      .eq("user_id", userId)
      .not("subscription_id", "is", null),
    supabase
      .from("subscription_price_history")
      .select("source_transaction_id")
      .eq("user_id", userId)
      .not("source_transaction_id", "is", null),
  ]);

  if (transactionsResult.error || historyResult.error) {
    throw new Error("Unable to load price insights");
  }

  const confirmedSourceIds = new Set(
    historyResult.data.flatMap((item) =>
      item.source_transaction_id ? [item.source_transaction_id] : [],
    ),
  );
  return detectPriceChanges(
    subscriptions,
    transactionsResult.data.flatMap((transaction) =>
      transaction.subscription_id
        ? [
            {
              id: transaction.id,
              subscriptionId: transaction.subscription_id,
              transactionDate: transaction.transaction_date,
              createdAt: transaction.created_at,
              amountMinor: transaction.amount_minor,
              currency: transaction.currency,
            },
          ]
        : [],
    ),
    confirmedSourceIds,
  );
}

export async function confirmPriceChangeForUser(
  subscriptionId: string,
  expectedUpdatedAt: string,
  expectedNewAmountMinor: number,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("confirm_subscription_price_change", {
    subscription_id: subscriptionId,
    expected_updated_at: expectedUpdatedAt,
    expected_new_amount_minor: expectedNewAmountMinor,
  });
  if (error) {
    if (
      error.message.includes("INSIGHT_CONFLICT") ||
      error.message.includes("PRICE_CHANGE_NOT_FOUND") ||
      error.code === "23505"
    ) {
      throw new InsightWriteConflictError();
    }
    throw new Error("Unable to confirm the price change");
  }
}

export async function getReminderNotificationsForUser(
  userId: string,
): Promise<ReminderNotification[]> {
  const supabase = await createSupabaseServerClient();
  const { data: reminders, error } = await supabase
    .from("reminders")
    .select(
      "id, subscription_id, import_suggestion_id, reminder_type, due_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("due_at", { ascending: true })
    .limit(20);
  if (error) throw new Error("Unable to load reminders");

  const subscriptionIds = reminders.flatMap((reminder) =>
    reminder.subscription_id ? [reminder.subscription_id] : [],
  );
  const suggestionIds = reminders.flatMap((reminder) =>
    reminder.import_suggestion_id ? [reminder.import_suggestion_id] : [],
  );
  const [subscriptionsResult, suggestionsResult] = await Promise.all([
    subscriptionIds.length
      ? supabase
          .from("subscriptions")
          .select("id, display_name")
          .eq("user_id", userId)
          .in("id", subscriptionIds)
      : Promise.resolve({ data: [], error: null }),
    suggestionIds.length
      ? supabase
          .from("import_suggestions")
          .select("id, display_name")
          .eq("user_id", userId)
          .in("id", suggestionIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (subscriptionsResult.error || suggestionsResult.error) {
    throw new Error("Unable to load reminder labels");
  }

  const labels = new Map([
    ...subscriptionsResult.data.map(
      (item) => [item.id, item.display_name] as const,
    ),
    ...suggestionsResult.data.map(
      (item) => [item.id, item.display_name] as const,
    ),
  ]);

  return reminders.map((reminder) => ({
    id: reminder.id,
    type: reminder.reminder_type,
    label:
      labels.get(
        reminder.subscription_id ?? reminder.import_suggestion_id ?? "",
      ) ?? "Subscription review",
    dueAt: reminder.due_at,
    updatedAt: reminder.updated_at,
  }));
}

export async function setReminderStatusForUser(
  reminderId: string,
  expectedUpdatedAt: string,
  status: "read" | "dismissed",
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("set_reminder_status", {
    reminder_id: reminderId,
    expected_updated_at: expectedUpdatedAt,
    reminder_status: status,
  });
  if (error) {
    if (error.message.includes("INSIGHT_CONFLICT")) {
      throw new InsightWriteConflictError();
    }
    throw new Error("Unable to update the reminder");
  }
}

export async function confirmProviderCancellationForUser(
  subscriptionId: string,
  expectedUpdatedAt: string,
) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("confirm_provider_cancellation", {
    subscription_id: subscriptionId,
    expected_updated_at: expectedUpdatedAt,
  });
  if (error) {
    if (error.message.includes("INSIGHT_CONFLICT")) {
      throw new InsightWriteConflictError();
    }
    throw new Error("Unable to confirm the provider cancellation");
  }
}
