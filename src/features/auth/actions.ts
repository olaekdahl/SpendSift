"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  getSupabasePublicConfig,
  getTrustedRequestOrigin,
} from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/server/auth";

import {
  getSafeNextPath,
  passwordResetSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "./schemas";
import type { AuthActionState } from "./state";

function fieldErrors(error: {
  flatten(): { fieldErrors: Record<string, string[]> };
}) {
  return error.flatten().fieldErrors;
}

export async function signInAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!result.success) {
    return { status: "error", fieldErrors: fieldErrors(result.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: result.data.email,
    password: result.data.password,
  });

  if (error) {
    return {
      status: "error",
      message: "The email or password is incorrect.",
    };
  }

  revalidatePath("/", "layout");
  redirect(getSafeNextPath(result.data.next));
}

export async function signUpAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    return { status: "error", fieldErrors: fieldErrors(result.error) };
  }

  const requestHeaders = await headers();
  const origin = getTrustedRequestOrigin(requestHeaders.get("origin"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "We could not create the account. Try again in a few minutes.",
    };
  }

  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }

  const isLocalSupabase = ["127.0.0.1", "localhost"].includes(
    new URL(getSupabasePublicConfig().url).hostname,
  );

  return {
    status: "success",
    message: isLocalSupabase
      ? "Check your email to confirm the account. For local development, open Mailpit at http://127.0.0.1:54324."
      : "Check your email to confirm the account.",
  };
}

export async function requestPasswordResetAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = passwordResetSchema.safeParse({
    email: formData.get("email"),
  });

  if (!result.success) {
    return { status: "error", fieldErrors: fieldErrors(result.error) };
  }

  const requestHeaders = await headers();
  const origin = getTrustedRequestOrigin(requestHeaders.get("origin"));
  const supabase = await createSupabaseServerClient();

  await supabase.auth.resetPasswordForEmail(result.data.email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });

  return {
    status: "success",
    message:
      "If an account matches that email, a password-reset message is on its way.",
  };
}

export async function updatePasswordAction(
  _previousState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const result = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.success) {
    return { status: "error", fieldErrors: fieldErrors(result.error) };
  }

  const supabase = await createSupabaseServerClient();
  const { data: claimsData, error: claimsError } =
    await supabase.auth.getClaims();

  if (claimsError || !claimsData?.claims?.sub) {
    return {
      status: "error",
      message:
        "This password-reset session is no longer valid. Request a new link.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: result.data.password,
  });

  if (error) {
    return {
      status: "error",
      message:
        "We could not update the password. Request a new link and try again.",
    };
  }

  return {
    status: "success",
    message: "Your password has been updated. You can return to the dashboard.",
  };
}

export async function signOutAction() {
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect("/auth/sign-in");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  revalidatePath("/", "layout");
  redirect("/auth/sign-in");
}
