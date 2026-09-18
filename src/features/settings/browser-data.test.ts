import { describe, expect, it } from "vitest";

import { toSettingsPreferences } from "./browser-data";

describe("settings browser data", () => {
  it("returns only fields rendered by the settings form", () => {
    const result = toSettingsPreferences({
      currency: "USD",
      locale: "en-US",
      timeZone: "UTC",
      renewalRemindersEnabled: true,
      trialRemindersEnabled: true,
      monthlyBudgetMinor: 8500,
      monthlySavingsGoalMinor: 2500,
    });

    expect(Object.keys(result).sort()).toEqual(
      [
        "currency",
        "locale",
        "monthlyBudgetMinor",
        "monthlySavingsGoalMinor",
        "renewalRemindersEnabled",
        "timeZone",
        "trialRemindersEnabled",
      ].sort(),
    );
    expect(result).not.toHaveProperty("id");
    expect(result).not.toHaveProperty("onboardingComplete");
    expect(result).not.toHaveProperty("realizedSavingsMinor");
  });
});
