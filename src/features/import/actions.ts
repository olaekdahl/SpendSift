"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAuthenticatedUser } from "@/server/auth";
import {
  approveImportSuggestionForUser,
  discardStatementImportForUser,
  ImportDalError,
  mergeImportSuggestionForUser,
  setImportSuggestionDecisionForUser,
  updateImportSuggestionForUser,
} from "@/server/dal/imports";

import type { ImportActionState } from "./action-state";
import {
  approveImportSuggestionSchema,
  decideImportSuggestionSchema,
  discardStatementImportSchema,
  editImportSuggestionSchema,
  importFormDataToObject,
  mergeImportSuggestionSchema,
} from "./review-schema";

function invalidState(error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}): ImportActionState {
  return { status: "error", fieldErrors: error.flatten().fieldErrors };
}

function writeError(error: unknown): ImportActionState {
  return {
    status: "error",
    message:
      error instanceof ImportDalError && error.code === "IMPORT_CONFLICT"
        ? "This suggestion changed in another request. Reload before trying again."
        : "We could not update this import. Try again.",
  };
}

function revalidateImport() {
  revalidatePath("/import");
  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
}

export async function editImportSuggestionAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  await requireAuthenticatedUser();
  const result = editImportSuggestionSchema.safeParse(
    importFormDataToObject(formData),
  );
  if (!result.success) return invalidState(result.error);

  try {
    await updateImportSuggestionForUser({
      suggestionId: result.data.suggestionId,
      expectedUpdatedAt: result.data.expectedUpdatedAt,
      displayName: result.data.displayName,
      amountMinor: result.data.amountMinor,
      billingFrequency: result.data.billingFrequency,
      nextBillingDate: result.data.nextBillingDate,
      startDate: result.data.startDate,
    });
  } catch (error) {
    return writeError(error);
  }

  revalidateImport();
  redirect(`/import?import=${result.data.importId}`);
}

export async function approveImportSuggestionAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  await requireAuthenticatedUser();
  const result = approveImportSuggestionSchema.safeParse(
    importFormDataToObject(formData),
  );
  if (!result.success) return invalidState(result.error);

  try {
    await approveImportSuggestionForUser(
      result.data.suggestionId,
      result.data.expectedUpdatedAt,
      result.data.category,
    );
  } catch (error) {
    return writeError(error);
  }

  revalidateImport();
  redirect(`/import?import=${result.data.importId}`);
}

export async function mergeImportSuggestionAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  await requireAuthenticatedUser();
  const result = mergeImportSuggestionSchema.safeParse(
    importFormDataToObject(formData),
  );
  if (!result.success) return invalidState(result.error);

  try {
    await mergeImportSuggestionForUser(
      result.data.suggestionId,
      result.data.expectedUpdatedAt,
      result.data.subscriptionId,
    );
  } catch (error) {
    return writeError(error);
  }

  revalidateImport();
  redirect(`/import?import=${result.data.importId}`);
}

export async function decideImportSuggestionAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  await requireAuthenticatedUser();
  const result = decideImportSuggestionSchema.safeParse(
    importFormDataToObject(formData),
  );
  if (!result.success) return invalidState(result.error);

  try {
    await setImportSuggestionDecisionForUser(
      result.data.suggestionId,
      result.data.expectedUpdatedAt,
      result.data.decision,
    );
  } catch (error) {
    return writeError(error);
  }

  revalidateImport();
  redirect(`/import?import=${result.data.importId}`);
}

export async function discardStatementImportAction(
  _previousState: ImportActionState,
  formData: FormData,
): Promise<ImportActionState> {
  await requireAuthenticatedUser();
  const result = discardStatementImportSchema.safeParse(
    importFormDataToObject(formData),
  );
  if (!result.success) return invalidState(result.error);

  try {
    await discardStatementImportForUser(result.data.importId);
  } catch (error) {
    return writeError(error);
  }

  revalidateImport();
  redirect("/import");
}
