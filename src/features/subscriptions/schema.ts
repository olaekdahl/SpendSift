import { z } from "zod";

export const subscriptionCategories = [
  "Video streaming",
  "Music",
  "Cloud storage",
  "News and publications",
  "Software",
  "Gaming",
  "Fitness",
  "Food delivery memberships",
  "Shopping memberships",
  "Security and privacy",
  "Other",
] as const;

export const billingFrequencies = [
  "weekly",
  "monthly",
  "every_two_months",
  "quarterly",
  "every_six_months",
  "annual",
  "custom",
] as const;

export const subscriptionStatuses = [
  "trial",
  "active",
  "paused",
  "cancelled",
  "expired",
  "needs_review",
] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const controlCharacterPattern = /[\u0000-\u001f\u007f]/;
const encodedControlCharacterPattern = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/i;

export const safeExternalUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .superRefine((value, context) => {
    if (
      controlCharacterPattern.test(value) ||
      encodedControlCharacterPattern.test(value)
    ) {
      context.addIssue({
        code: "custom",
        message: "URL must not contain control characters",
      });
      return;
    }

    let url: URL;

    try {
      url = new URL(value);
    } catch {
      context.addIssue({ code: "custom", message: "URL must be valid" });
      return;
    }

    if (
      url.protocol !== "https:" ||
      !value.toLowerCase().startsWith("https://") ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      context.addIssue({
        code: "custom",
        message: "URL must use HTTPS without embedded credentials",
      });
    }
  });

export const subscriptionSchema = z.object({
  id: z.string().min(1),
  merchantName: z.string().min(1),
  displayName: z.string().min(1),
  category: z.enum(subscriptionCategories),
  amountMinor: z.number().int().nonnegative(),
  currency: z.string().length(3),
  frequency: z.enum(billingFrequencies),
  customIntervalDays: z.number().int().positive().optional(),
  nextBillingDate: isoDate,
  startDate: isoDate,
  trialEndDate: isoDate.optional(),
  status: z.enum(subscriptionStatuses),
  paymentMethodNickname: z.string().min(1),
  website: safeExternalUrlSchema.optional(),
  source: z.enum(["manual", "statement_import"]),
  previousAmountMinor: z.number().int().nonnegative().optional(),
  savingsCandidate: z.boolean(),
  brandColor: z.string().regex(/^#[0-9a-f]{6}$/i),
});

export type Subscription = z.infer<typeof subscriptionSchema>;
export type SubscriptionCategory = Subscription["category"];
export type SubscriptionStatus = Subscription["status"];
