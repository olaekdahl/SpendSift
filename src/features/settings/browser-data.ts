export type SettingsPreferences = {
  currency: string;
  locale: string;
  timeZone: string;
  renewalRemindersEnabled: boolean;
  trialRemindersEnabled: boolean;
  monthlyBudgetMinor: number | null;
  monthlySavingsGoalMinor: number | null;
  overlapThreshold: number;
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
    overlapThreshold: profile.overlapThreshold,
  } satisfies SettingsPreferences;
}
