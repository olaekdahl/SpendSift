import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { AuthenticatedUser } from "@/server/auth";

export class AccountSecurityError extends Error {
  constructor(
    readonly code:
      | "RATE_LIMITED"
      | "REAUTH_FAILED"
      | "ACTION_EXPIRED"
      | "EXPORT_FAILED"
      | "DELETE_FAILED",
  ) {
    super(code);
    this.name = "AccountSecurityError";
  }
}

function isRateLimitError(message: string) {
  return (
    message.includes("ACCOUNT_ACTION_RATE_LIMIT") ||
    message.includes("ACCOUNT_ACTION_NETWORK_LIMIT")
  );
}

export async function beginAccountAction(
  actionName: "export" | "delete",
  networkSha256: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("begin_account_action", {
    action_name: actionName,
    network_sha256: networkSha256,
  });
  if (error || !data) {
    throw new AccountSecurityError(
      error && isRateLimitError(error.message)
        ? "RATE_LIMITED"
        : "ACTION_EXPIRED",
    );
  }
  return data;
}

export async function finishAccountAction(
  attemptId: string,
  safeResultCode: string,
) {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("finish_account_action", {
    attempt_id: attemptId,
    safe_result_code: safeResultCode,
  });
}

async function reauthenticate(
  user: AuthenticatedUser,
  password: string,
): Promise<SupabaseClient<Database>> {
  if (!user.email) throw new AccountSecurityError("REAUTH_FAILED");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (error) throw new AccountSecurityError("REAUTH_FAILED");

  const { data, error: claimsError } = await supabase.auth.getClaims();
  if (claimsError || data?.claims?.sub !== user.id) {
    throw new AccountSecurityError("REAUTH_FAILED");
  }
  return supabase;
}

export async function exportCurrentUserData(
  user: AuthenticatedUser,
  password: string,
  attemptId: string,
): Promise<Json> {
  const supabase = await reauthenticate(user, password);
  const { data, error } = await supabase.rpc("export_current_user_data", {
    action_attempt_id: attemptId,
  });
  if (error || !data) {
    throw new AccountSecurityError(
      error?.message.includes("RECENT_AUTH_REQUIRED") ||
        error?.message.includes("INVALID_ACCOUNT_ACTION_PERMIT")
        ? "ACTION_EXPIRED"
        : "EXPORT_FAILED",
    );
  }
  return data;
}

export async function deleteCurrentUser(
  user: AuthenticatedUser,
  password: string,
  confirmation: string,
  attemptId: string,
) {
  const supabase = await reauthenticate(user, password);
  const { error } = await supabase.rpc("delete_current_user", {
    action_attempt_id: attemptId,
    confirmation,
  });
  if (error) {
    throw new AccountSecurityError(
      error.message.includes("RECENT_AUTH_REQUIRED") ||
        error.message.includes("INVALID_ACCOUNT_ACTION_PERMIT")
        ? "ACTION_EXPIRED"
        : "DELETE_FAILED",
    );
  }

  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}
