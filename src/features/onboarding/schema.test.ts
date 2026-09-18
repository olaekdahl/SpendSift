import { describe, expect, it } from "vitest";

import { formatMinorUnitsForInput, onboardingSchema } from "./schema";

const validInput = {
  preferredCurrency: "USD",
  locale: "en-US",
  timeZone: "America/New_York",
  monthlyBudgetMinor: "85.25",
  monthlySavingsGoalMinor: "",
  overlapThreshold: "2",
  renewalRemindersEnabled: "on",
  trialRemindersEnabled: null,
};

describe("onboardingSchema", () => {
  it("parses optional money without floating-point storage", () => {
    const result = onboardingSchema.parse(validInput);

    expect(result.monthlyBudgetMinor).toBe(8525);
    expect(result.monthlySavingsGoalMinor).toBeNull();
    expect(result.renewalRemindersEnabled).toBe(true);
    expect(result.trialRemindersEnabled).toBe(false);
  });

  it.each(["1.234", "-1", "1e3", "abc", "10000000"])(
    "rejects invalid money input %s",
    (monthlyBudgetMinor) => {
      expect(
        onboardingSchema.safeParse({ ...validInput, monthlyBudgetMinor })
          .success,
      ).toBe(false);
    },
  );

  it("rejects an invalid time zone", () => {
    expect(
      onboardingSchema.safeParse({ ...validInput, timeZone: "Not/AZone" })
        .success,
    ).toBe(false);
  });

  it.each(["1", "6", "2.5", "script"])(
    "rejects invalid overlap threshold %s",
    (overlapThreshold) => {
      expect(
        onboardingSchema.safeParse({ ...validInput, overlapThreshold }).success,
      ).toBe(false);
    },
  );

  it("formats stored minor units for form inputs", () => {
    expect(formatMinorUnitsForInput(8525)).toBe("85.25");
    expect(formatMinorUnitsForInput(null)).toBe("");
  });
});
