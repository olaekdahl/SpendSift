import { z } from "zod";

export const confirmPriceChangeSchema = z
  .object({
    subscriptionId: z.uuid(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    expectedNewAmountMinor: z.coerce
      .number()
      .int()
      .positive()
      .max(2_000_000_000),
  })
  .strict();

export const reminderStatusSchema = z
  .object({
    reminderId: z.uuid(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    status: z.enum(["read", "dismissed"]),
  })
  .strict();

export const providerCancellationSchema = z
  .object({
    subscriptionId: z.uuid(),
    expectedUpdatedAt: z.iso.datetime({ offset: true }),
    confirmation: z.literal("provider-confirmed"),
  })
  .strict();

export function insightFormDataToObject(formData: FormData) {
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
