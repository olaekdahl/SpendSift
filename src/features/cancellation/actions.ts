"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/server/auth";
import {
  CancellationGuideConflictError,
  saveCancellationGuideForUser,
} from "@/server/dal/cancellation-guides";

import type { CancellationGuideActionState } from "./action-state";
import {
  cancellationFormDataToObject,
  cancellationGuideSchema,
} from "./schema";

export async function saveCancellationGuideAction(
  _previousState: CancellationGuideActionState,
  formData: FormData,
): Promise<CancellationGuideActionState> {
  await requireAuthenticatedUser();
  const result = cancellationGuideSchema.safeParse(
    cancellationFormDataToObject(formData),
  );
  if (!result.success) {
    return {
      status: "error",
      message: "Check the highlighted guide details.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await saveCancellationGuideForUser(result.data);
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof CancellationGuideConflictError
          ? "This guide changed in another request. Reload before trying again."
          : "We could not save this guide. Try again.",
    };
  }

  revalidatePath(`/subscriptions/${result.data.subscriptionId}`);
  redirect(`/subscriptions/${result.data.subscriptionId}`);
}
