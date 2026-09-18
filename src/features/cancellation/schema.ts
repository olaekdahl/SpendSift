import { z } from "zod";

import { safeExternalUrlSchema } from "@/features/subscriptions/schema";

const unsupportedControl = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;

function optionalText(maxLength: number) {
  return z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z
      .string()
      .trim()
      .max(maxLength)
      .refine(
        (value) => !unsupportedControl.test(value),
        "Remove unsupported control characters",
      )
      .optional(),
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
  z.iso
    .date()
    .refine(
      (value) =>
        value >= "2000-01-01" && value <= new Date().toISOString().slice(0, 10),
      "Verification date cannot be in the future",
    )
    .optional(),
);

const optionalPhone = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z
    .string()
    .trim()
    .regex(/^[+0-9() .-]{3,40}$/, "Enter a valid phone number")
    .optional(),
);

export const cancellationGuideSchema = z
  .object({
    subscriptionId: z.uuid(),
    expectedGuideUpdatedAt: z.preprocess(
      (value) =>
        typeof value === "string" && value.trim() === "" ? undefined : value,
      z.iso.datetime({ offset: true }).optional(),
    ),
    cancellationUrl: optionalUrl,
    phoneNumber: optionalPhone,
    instructions: optionalText(4000),
    verifiedAt: optionalDate,
    userNotes: optionalText(4000),
  })
  .strict();

export type CancellationGuideInput = z.infer<typeof cancellationGuideSchema>;

export function cancellationFormDataToObject(formData: FormData) {
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
