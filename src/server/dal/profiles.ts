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
};

export type ProfilePreferencesInput = {
  currency: string;
  locale: string;
  timeZone: string;
  renewalRemindersEnabled: boolean;
  trialRemindersEnabled: boolean;
  monthlyBudgetMinor: number | null;
  monthlySavingsGoalMinor: number | null;
};

export const getProfileForUser = cache(
  async (userId: string): Promise<ProfileDto> => {
    const supabase = await createSupabaseServerClient();
    const [
      { data: profile, error: profileError },
      { data: budgets, error: budgetError },
      { data: goals, error: goalError },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, preferred_currency, locale, time_zone, renewal_reminders_enabled, trial_reminders_enabled, onboarding_completed_at",
        )
        .eq("user_id", userId)
        .single(),
      supabase
        .from("budgets")
        .select("monthly_limit_minor, currency")
        .eq("user_id", userId),
      supabase
        .from("savings_goals")
        .select("monthly_target_minor, realized_monthly_minor, currency")
        .eq("user_id", userId),
    ]);

    if (profileError || !profile || budgetError || goalError) {
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
      realizedSavingsMinor: goal?.realized_monthly_minor ?? 0,
    };
  },
);

export async function saveProfilePreferences(input: ProfilePreferencesInput) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("complete_onboarding", {
    preferred_currency: input.currency,
    locale: input.locale,
    time_zone: input.timeZone,
    renewal_reminders_enabled: input.renewalRemindersEnabled,
    trial_reminders_enabled: input.trialRemindersEnabled,
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
