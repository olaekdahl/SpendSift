import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ProfileDto = {
  id: string;
  currency: string;
  locale: string;
  timeZone: string;
  renewalRemindersEnabled: boolean;
  trialRemindersEnabled: boolean;
  onboardingComplete: boolean;
  monthlyBudgetMinor: number | null;
  monthlySavingsGoalMinor: number | null;
  realizedSavingsMinor: number;
  overlapThreshold: number;
};

export type ProfilePreferencesInput = {
  currency: string;
  locale: string;
  timeZone: string;
  renewalRemindersEnabled: boolean;
  trialRemindersEnabled: boolean;
  monthlyBudgetMinor: number | null;
  monthlySavingsGoalMinor: number | null;
  overlapThreshold: number;
};

export const getProfileForUser = cache(
  async (userId: string): Promise<ProfileDto> => {
    const supabase = await createSupabaseServerClient();
    const [
      { data: profile, error: profileError },
      { data: budgets, error: budgetError },
      { data: goals, error: goalError },
      { data: realizedSubscriptions, error: realizedError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, preferred_currency, locale, time_zone, overlap_threshold, renewal_reminders_enabled, trial_reminders_enabled, onboarding_completed_at",
        )
        .eq("user_id", userId)
        .single(),
      supabase
        .from("budgets")
        .select("monthly_limit_minor, currency")
        .eq("user_id", userId),
      supabase
        .from("savings_goals")
        .select("monthly_target_minor, currency")
        .eq("user_id", userId),
      supabase
        .from("subscriptions")
        .select("realized_monthly_minor, currency")
        .eq("user_id", userId)
        .not("provider_cancelled_at", "is", null),
    ]);

    if (profileError || !profile || budgetError || goalError || realizedError) {
      throw new Error("Unable to load the profile");
    }

    const budget = budgets.find(
      (item) => item.currency === profile.preferred_currency,
    );
    const goal = goals.find(
      (item) => item.currency === profile.preferred_currency,
    );

    return {
      id: profile.id,
      currency: profile.preferred_currency,
      locale: profile.locale,
      timeZone: profile.time_zone,
      renewalRemindersEnabled: profile.renewal_reminders_enabled,
      trialRemindersEnabled: profile.trial_reminders_enabled,
      onboardingComplete: profile.onboarding_completed_at !== null,
      monthlyBudgetMinor: budget?.monthly_limit_minor ?? null,
      monthlySavingsGoalMinor: goal?.monthly_target_minor ?? null,
      realizedSavingsMinor: realizedSubscriptions.reduce(
        (total, subscription) =>
          total +
          (subscription.currency === profile.preferred_currency
            ? (subscription.realized_monthly_minor ?? 0)
            : 0),
        0,
      ),
      overlapThreshold: profile.overlap_threshold,
    };
  },
);

export async function saveProfilePreferences(input: ProfilePreferencesInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("save_profile_preferences", {
    preferred_currency: input.currency,
    locale: input.locale,
    time_zone: input.timeZone,
    renewal_reminders_enabled: input.renewalRemindersEnabled,
    trial_reminders_enabled: input.trialRemindersEnabled,
    overlap_threshold: input.overlapThreshold,
    ...(input.monthlyBudgetMinor === null
      ? {}
      : { monthly_budget_minor: input.monthlyBudgetMinor }),
    ...(input.monthlySavingsGoalMinor === null
      ? {}
      : { monthly_savings_goal_minor: input.monthlySavingsGoalMinor }),
  });

  if (error) {
    throw new Error("Unable to save profile preferences");
  }
}
