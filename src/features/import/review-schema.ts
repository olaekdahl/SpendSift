import { z } from "zod";

import {
  billingFrequencies,
  subscriptionCategories,
} from "@/features/subscriptions/schema";

const detectedFrequencies = billingFrequencies.filter(
  (frequency) => frequency !== "custom",
) as [
  "weekly",
  "monthly",
  "every_two_months",
  "quarterly",
  "every_six_months",
  "annual",
];

const amountMinor = z.preprocess((value) => {
  if (
    typeof value !== "string" ||
    !/^\d{1,7}(?:\.\d{1,2})?$/.test(value.trim())
  ) {
    return Number.NaN;
  }
  const [whole, fraction = ""] = value.trim().split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}, z.number().int().positive().max(2_000_000_000));

const versionShape = {
  suggestionId: z.uuid(),
  importId: z.uuid(),
  expectedUpdatedAt: z.iso.datetime({ offset: true }),
};

const editSuggestionObject = z
  .object({
    ...versionShape,
    displayName: z.string().trim().min(1).max(120),
    amountMinor,
    billingFrequency: z.enum(detectedFrequencies),
    nextBillingDate: z.iso.date(),
    startDate: z.iso.date(),
  })
  .strict();

export const editImportSuggestionSchema = editSuggestionObject.superRefine(
  (value, context) => {
    if (value.nextBillingDate < value.startDate) {
      context.addIssue({
        code: "custom",
        message: "Next billing date cannot be before the start date",
        path: ["nextBillingDate"],
      });
    }
  },
);

export const approveImportSuggestionSchema = z
  .object({
    ...versionShape,
    category: z.enum(subscriptionCategories),
  })
  .strict();

export const mergeImportSuggestionSchema = z
  .object({
    ...versionShape,
    subscriptionId: z.uuid(),
  })
  .strict();

export const decideImportSuggestionSchema = z
  .object({
    ...versionShape,
    decision: z.enum(["rejected", "deferred"]),
  })
  .strict();

export const discardStatementImportSchema = z
  .object({ importId: z.uuid(), confirmation: z.literal("discard") })
  .strict();

export function importFormDataToObject(formData: FormData) {
  const result: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const [name, value] of formData.entries()) {
    if (name.startsWith("$ACTION_")) continue;
    const current = result[name];
    result[name] =
      current === undefined
        ? value
        : Array.isArray(current)
          ? [...current, value]
          : [current, value];
  }
  return result;
}
