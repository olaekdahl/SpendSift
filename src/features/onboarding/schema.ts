import { z } from "zod";

function parseOptionalMoney(value: unknown) {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const normalized = value.trim();
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) {
    return Number.NaN;
  }

  const [whole, fraction = ""] = normalized.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

const optionalMoneySchema = z
  .preprocess(
    parseOptionalMoney,
    z.number().int().min(0).max(100_000_000).nullable(),
  )
  .refine((value) => value === null || Number.isFinite(value), {
    message: "Enter a valid amount with no more than two decimal places",
  });

const timeZoneSchema = z
  .string()
  .trim()
  .min(1, "Select a time zone")
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Select a valid time zone");

const checkboxSchema = z.preprocess(
  (value) => value === "on" || value === "true",
  z.boolean(),
);

export const onboardingSchema = z.object({
  preferredCurrency: z.enum(["USD"]),
  locale: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/),
  timeZone: timeZoneSchema,
  monthlyBudgetMinor: optionalMoneySchema,
  monthlySavingsGoalMinor: optionalMoneySchema,
  renewalRemindersEnabled: checkboxSchema,
  trialRemindersEnabled: checkboxSchema,
});

export function formatMinorUnitsForInput(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2);
}
