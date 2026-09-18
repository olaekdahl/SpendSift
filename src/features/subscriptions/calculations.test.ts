import { describe, expect, it } from "vitest";

import { demoBudgetMinor, demoSubscriptions } from "./demo-data";
import {
  annualizedAmountMinor,
  formatMoney,
  getDashboardSummary,
  getPriceIncrease,
  monthlyEquivalentMinor,
} from "./calculations";

describe("subscription calculations", () => {
  it("converts common billing frequencies to annual minor units", () => {
    const monthly = demoSubscriptions.find(
      (subscription) => subscription.id === "sub_northstar",
    );
    const annual = demoSubscriptions.find(
      (subscription) => subscription.id === "sub_formflow",
    );

    expect(monthly && annualizedAmountMinor(monthly)).toBe(22_788);
    expect(annual && annualizedAmountMinor(annual)).toBe(8_999);
    expect(annual && monthlyEquivalentMinor(annual)).toBe(750);
  });

  it.each([
    ["weekly", undefined, 5200, 433],
    ["monthly", undefined, 1200, 100],
    ["every_two_months", undefined, 600, 50],
    ["quarterly", undefined, 400, 33],
    ["every_six_months", undefined, 200, 17],
    ["annual", undefined, 100, 8],
    ["custom", 10, 3650, 304],
  ] as const)(
    "converts %s billing without stored floating point",
    (frequency, customIntervalDays, annual, monthly) => {
      const fixture = {
        ...demoSubscriptions[0],
        amountMinor: 100,
        frequency,
        customIntervalDays,
      };
      expect(annualizedAmountMinor(fixture)).toBe(annual);
      expect(monthlyEquivalentMinor(fixture)).toBe(monthly);
    },
  );

  it("calculates dashboard totals from active and trial records", () => {
    expect(getDashboardSummary(demoSubscriptions, demoBudgetMinor)).toEqual({
      activeCount: 6,
      annualCostMinor: 73_751,
      monthlyCostMinor: 6_146,
      budgetRemainingMinor: 2_354,
      potentialSavingsMinor: 2_099,
    });
  });

  it("formats integer minor units as localized money", () => {
    expect(formatMoney(6_146)).toBe("$61.46");
  });

  it("reports a price increase only when the current amount is higher", () => {
    const subscription = demoSubscriptions.find(
      (item) => item.id === "sub_northstar",
    );

    expect(
      subscription && getPriceIncrease(subscription)?.percentage,
    ).toBeCloseTo(18.76, 2);
  });
});
