import { z } from "zod";

import {
  billingFrequencies,
  safeExternalUrlSchema,
  subscriptionCategories,
  subscriptionStatuses,
} from "./schema";

function optionalText(maxLength: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().max(maxLength).optional(),
  );
}

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  safeExternalUrlSchema.optional(),
);

const optionalDate = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.iso.date().optional(),
);

const optionalInteger = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === ""
      ? undefined
      : Number(value),
  z.number().int().min(1).max(3660).optional(),
);

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

const reminderLeadDays = z.preprocess(
  (value) => Number(value),
  z.number().int().min(0).max(365),
);

const subscriptionFormShape = {
  merchantName: z.string().trim().min(1).max(200),
  displayName: z.string().trim().min(1).max(120),
  category: z.enum(subscriptionCategories),
  amountMinor,
  currency: z.enum(["USD"]),
  frequency: z.enum(billingFrequencies),
  customIntervalDays: optionalInteger,
  nextBillingDate: z.iso.date(),
  startDate: z.iso.date(),
  trialEndDate: optionalDate,
  status: z.enum(subscriptionStatuses),
  paymentMethodNickname: optionalText(80),
  website: optionalUrl,
  cancellationUrl: optionalUrl,
  cancellationInstructions: optionalText(4000),
  notes: optionalText(4000),
  reminderLeadDays,
};

type DateFields = {
  startDate: string;
  nextBillingDate: string;
  trialEndDate?: string;
  frequency: (typeof billingFrequencies)[number];
  customIntervalDays?: number;
};

function validateRelationships(value: DateFields, context: z.RefinementCtx) {
  if (value.frequency === "custom" && !value.customIntervalDays) {
    context.addIssue({
      code: "custom",
      message: "Enter the number of days for a custom interval",
      path: ["customIntervalDays"],
    });
  }

  if (value.frequency !== "custom" && value.customIntervalDays) {
    context.addIssue({
      code: "custom",
      message: "Custom interval days apply only to custom billing",
      path: ["customIntervalDays"],
    });
  }

  if (value.nextBillingDate < value.startDate) {
    context.addIssue({
      code: "custom",
      message: "Next billing date cannot be before the start date",
      path: ["nextBillingDate"],
    });
  }

  if (value.trialEndDate && value.trialEndDate < value.startDate) {
    context.addIssue({
      code: "custom",
      message: "Trial end date cannot be before the start date",
      path: ["trialEndDate"],
    });
  }
}

const subscriptionFormObject = z.object(subscriptionFormShape).strict();

export const subscriptionFormSchema = subscriptionFormObject.superRefine(
  validateRelationships,
);

export const updateSubscriptionSchema = subscriptionFormObject
  .extend({
    id: z.uuid(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
  })
  .superRefine(validateRelationships);

export const subscriptionVersionSchema = z
  .object({
    id: z.uuid(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
  })
  .strict();

export const deleteSubscriptionSchema = subscriptionVersionSchema.extend({
  confirmation: z.literal("delete"),
});

export type SubscriptionFormInput = z.infer<typeof subscriptionFormSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

export function formDataToObject(formData: FormData) {
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

export function formatMinorUnitsForSubscriptionInput(amount: number) {
  return (amount / 100).toFixed(2);
}
