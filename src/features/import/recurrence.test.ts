import { describe, expect, it } from "vitest";

import { detectRecurringCharges } from "./recurrence";
import type { ParsedStatementTransaction } from "./statement-parser";

function charges(
  dates: string[],
  merchant = "NORTHSTAR CINEMA",
  amounts = dates.map(() => -1599),
): ParsedStatementTransaction[] {
  return dates.map((transactionDate, index) => ({
    transactionDate,
    normalizedMerchant: merchant,
    amountMinor: amounts[index],
    currency: "USD",
  }));
}

describe("recurrence detection", () => {
  it.each([
    [["2026-08-01", "2026-08-08", "2026-08-15"], "weekly"],
    [["2026-06-30", "2026-07-31", "2026-08-31"], "monthly"],
    [["2026-01-15", "2026-04-15", "2026-07-15"], "quarterly"],
    [["2024-02-29", "2025-02-28", "2026-02-28"], "annual"],
  ])("detects the %s pattern", (dates, expectedFrequency) => {
    expect(detectRecurringCharges(charges(dates))[0].billingFrequency).toBe(
      expectedFrequency,
    );
  });

  it("handles billing-date shifts and computes a calendar-safe next date", () => {
    const [suggestion] = detectRecurringCharges(
      charges(["2026-06-30", "2026-07-31", "2026-08-31"]),
    );
    expect(suggestion.nextBillingDate).toBe("2026-09-30");
    expect(suggestion.reasonSummary).toBe(
      "3 charges appeared about one month apart with the same amount.",
    );
    expect(suggestion.confidenceScore).toBeGreaterThanOrEqual(90);
  });

  it("reports a stable reason when the latest amount changes modestly", () => {
    const [suggestion] = detectRecurringCharges(
      charges(
        ["2026-06-21", "2026-07-21", "2026-08-21"],
        "NORTHSTAR CINEMA",
        [-1599, -1599, -1899],
      ),
    );
    expect(suggestion.amountMinor).toBe(1899);
    expect(suggestion.reasonCode).toBe("MONTHLY_VARIABLE");
    expect(suggestion.reasonSummary).toContain("modest amount change");
  });

  it("ignores credits, one-off charges, and irregular intervals", () => {
    expect(
      detectRecurringCharges([
        ...charges(["2026-01-01"], "ONE OFF"),
        ...charges(["2026-01-01", "2026-02-12", "2026-04-23"], "IRREGULAR"),
        ...charges(["2026-01-01", "2026-02-01"], "CREDIT").map((item) => ({
          ...item,
          amountMinor: 500,
        })),
      ]),
    ).toEqual([]);
  });
});
