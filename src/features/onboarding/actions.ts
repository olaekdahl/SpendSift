"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthenticatedUser } from "@/server/auth";
import { saveProfilePreferences } from "@/server/dal/profiles";

import { onboardingSchema } from "./schema";
import type { OnboardingActionState } from "./state";

async function saveValidatedPreferences(
  formData: FormData,
): Promise<OnboardingActionState | null> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const result = onboardingSchema.safeParse({
    preferredCurrency: formData.get("preferredCurrency"),
    locale: formData.get("locale"),
    timeZone: formData.get("timeZone"),
    monthlyBudgetMinor: formData.get("monthlyBudget"),
    monthlySavingsGoalMinor: formData.get("monthlySavingsGoal"),
    renewalRemindersEnabled: formData.get("renewalRemindersEnabled"),
    trialRemindersEnabled: formData.get("trialRemindersEnabled"),
  });

  if (!result.success) {
    return {
      status: "error",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  try {
    await saveProfilePreferences({
      currency: result.data.preferredCurrency,
      locale: result.data.locale,
      timeZone: result.data.timeZone,
      renewalRemindersEnabled: result.data.renewalRemindersEnabled,
      trialRemindersEnabled: result.data.trialRemindersEnabled,
      monthlyBudgetMinor: result.data.monthlyBudgetMinor,
      monthlySavingsGoalMinor: result.data.monthlySavingsGoalMinor,
    });
  } catch {
    return {
      status: "error",
      message: "We could not save your preferences. Try again.",
    };
  }

  revalidatePath("/", "layout");
  return null;
}

export async function completeOnboardingAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const errorState = await saveValidatedPreferences(formData);
  if (errorState) return errorState;
  redirect("/dashboard");
}

export async function updatePreferencesAction(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const errorState = await saveValidatedPreferences(formData);
  if (errorState) return errorState;
  return { status: "success", message: "Preferences saved." };
}
