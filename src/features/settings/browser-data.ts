export type SettingsPreferences = {
  currency: string;
  locale: string;
  timeZone: string;
  renewalRemindersEnabled: boolean;
  trialRemindersEnabled: boolean;
  monthlyBudgetMinor: number | null;
  monthlySavingsGoalMinor: number | null;
};

export function toSettingsPreferences(profile: SettingsPreferences) {
  return {
    currency: profile.currency,
    locale: profile.locale,
    timeZone: profile.timeZone,
    renewalRemindersEnabled: profile.renewalRemindersEnabled,
    trialRemindersEnabled: profile.trialRemindersEnabled,
    monthlyBudgetMinor: profile.monthlyBudgetMinor,
    monthlySavingsGoalMinor: profile.monthlySavingsGoalMinor,
  } satisfies SettingsPreferences;
}
