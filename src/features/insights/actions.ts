"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/server/auth";
import {
  confirmProviderCancellationForUser,
  confirmPriceChangeForUser,
  InsightWriteConflictError,
} from "@/server/dal/insights";
import { inAppNotificationService } from "@/server/notifications/in-app";

import {
  confirmPriceChangeSchema,
  insightFormDataToObject,
  providerCancellationSchema,
  reminderStatusSchema,
} from "./action-schema";
import type { InsightActionState } from "./action-state";

function invalidState(error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}): InsightActionState {
  return { status: "error", fieldErrors: error.flatten().fieldErrors };
}

function writeError(error: unknown): InsightActionState {
  return {
    status: "error",
    message:
      error instanceof InsightWriteConflictError
        ? "This insight changed in another request. Reload before trying again."
        : "We could not update this insight. Try again.",
  };
}

export async function confirmPriceChangeAction(
  _previousState: InsightActionState,
  formData: FormData,
): Promise<InsightActionState> {
  await requireAuthenticatedUser();
  const result = confirmPriceChangeSchema.safeParse(
    insightFormDataToObject(formData),
  );
  if (!result.success) return invalidState(result.error);

  try {
    await confirmPriceChangeForUser(
      result.data.subscriptionId,
      result.data.expectedUpdatedAt,
      result.data.expectedNewAmountMinor,
    );
  } catch (error) {
    return writeError(error);
  }

  revalidatePath("/dashboard");
  revalidatePath("/subscriptions");
  revalidatePath("/savings");
  redirect("/dashboard");
}

export async function updateReminderAction(
  _previousState: InsightActionState,
  formData: FormData,
): Promise<InsightActionState> {
  await requireAuthenticatedUser();
  const result = reminderStatusSchema.safeParse(
    insightFormDataToObject(formData),
  );
  if (!result.success) return invalidState(result.error);

  try {
    await inAppNotificationService.setStatus(
      result.data.reminderId,
      result.data.expectedUpdatedAt,
      result.data.status,
    );
  } catch (error) {
    return writeError(error);
  }

  revalidatePath("/calendar");
  redirect("/calendar");
}

export async function confirmProviderCancellationAction(
  _previousState: InsightActionState,
  formData: FormData,
): Promise<InsightActionState> {
  await requireAuthenticatedUser();
  const result = providerCancellationSchema.safeParse(
    insightFormDataToObject(formData),
  );
  if (!result.success) return invalidState(result.error);

  try {
    await confirmProviderCancellationForUser(
      result.data.subscriptionId,
      result.data.expectedUpdatedAt,
    );
  } catch (error) {
    return writeError(error);
  }

  revalidatePath("/", "layout");
  redirect("/savings");
}
