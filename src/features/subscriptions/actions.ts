"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/server/auth";
import {
  archiveSubscriptionForUser,
  createSubscriptionForUser,
  deleteSubscriptionForUser,
  SubscriptionWriteConflictError,
  updateSubscriptionForUser,
} from "@/server/dal/subscriptions";

import type { SubscriptionActionState } from "./action-state";
import {
  deleteSubscriptionSchema,
  formDataToObject,
  subscriptionFormSchema,
  subscriptionVersionSchema,
  updateSubscriptionSchema,
} from "./form-schema";

function invalidState(error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}) {
  return {
    status: "error" as const,
    fieldErrors: error.flatten().fieldErrors,
  };
}

function writeError(error: unknown): SubscriptionActionState {
  if (error instanceof SubscriptionWriteConflictError) {
    return {
      status: "error",
      message:
        "This subscription changed in another request. Reload the page before trying again.",
    };
  }

  return {
    status: "error",
    message: "We could not save this subscription. Try again.",
  };
}

export async function createSubscriptionAction(
  _previousState: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const user = await requireAuthenticatedUser();
  const result = subscriptionFormSchema.safeParse(formDataToObject(formData));

  if (!result.success) return invalidState(result.error);

  let subscription;
  try {
    subscription = await createSubscriptionForUser(user.id, result.data);
  } catch (error) {
    return writeError(error);
  }

  revalidatePath("/", "layout");
  redirect(`/subscriptions/${subscription.id}`);
}

export async function updateSubscriptionAction(
  _previousState: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const user = await requireAuthenticatedUser();
  const result = updateSubscriptionSchema.safeParse(formDataToObject(formData));

  if (!result.success) return invalidState(result.error);

  const { id, expectedUpdatedAt, ...input } = result.data;

  try {
    await updateSubscriptionForUser(user.id, id, expectedUpdatedAt, input);
  } catch (error) {
    return writeError(error);
  }

  revalidatePath("/", "layout");
  redirect(`/subscriptions/${id}`);
}

export async function archiveSubscriptionAction(
  _previousState: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const user = await requireAuthenticatedUser();
  const result = subscriptionVersionSchema.safeParse(
    formDataToObject(formData),
  );

  if (!result.success) return invalidState(result.error);

  try {
    await archiveSubscriptionForUser(
      user.id,
      result.data.id,
      result.data.expectedUpdatedAt,
    );
  } catch (error) {
    return writeError(error);
  }

  revalidatePath("/", "layout");
  redirect("/subscriptions");
}

export async function deleteSubscriptionAction(
  _previousState: SubscriptionActionState,
  formData: FormData,
): Promise<SubscriptionActionState> {
  const user = await requireAuthenticatedUser();
  const result = deleteSubscriptionSchema.safeParse(formDataToObject(formData));

  if (!result.success) return invalidState(result.error);

  try {
    await deleteSubscriptionForUser(
      user.id,
      result.data.id,
      result.data.expectedUpdatedAt,
    );
  } catch (error) {
    return writeError(error);
  }

  revalidatePath("/", "layout");
  redirect("/subscriptions");
}
