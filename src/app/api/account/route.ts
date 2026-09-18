import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { deleteAccountSchema } from "@/features/privacy/schema";
import { getAuthenticatedUser } from "@/server/auth";
import {
  AccountSecurityError,
  beginAccountAction,
  deleteCurrentUser,
  finishAccountAction,
} from "@/server/account-security";
import {
  AccountRequestError,
  accountNetworkFingerprint,
  readAccountJson,
  validateAccountRequest,
} from "@/server/account-request";

export const runtime = "nodejs";

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

async function expireAuthCookies() {
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) cookieStore.delete(cookie.name);
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return jsonResponse({ ok: false, code: "AUTH_REQUIRED" }, 401);

  let attemptId: string | null = null;
  try {
    validateAccountRequest(request);
    attemptId = await beginAccountAction(
      "delete",
      accountNetworkFingerprint(request),
    );
    const result = deleteAccountSchema.safeParse(
      await readAccountJson(request),
    );
    if (!result.success) throw new AccountRequestError("INVALID_REQUEST", 400);

    await deleteCurrentUser(
      user,
      result.data.password,
      result.data.confirmation,
      attemptId,
    );
    await expireAuthCookies();
    return jsonResponse({ ok: true }, 200);
  } catch (error) {
    const code =
      error instanceof AccountRequestError
        ? error.code
        : error instanceof AccountSecurityError
          ? error.code
          : "DELETE_FAILED";
    const status =
      error instanceof AccountRequestError
        ? error.status
        : error instanceof AccountSecurityError && error.code === "RATE_LIMITED"
          ? 429
          : error instanceof AccountSecurityError &&
              error.code === "REAUTH_FAILED"
            ? 401
            : 400;
    if (attemptId) {
      await finishAccountAction(attemptId, code).catch(() => undefined);
    }
    return jsonResponse(
      code === "REAUTH_FAILED" ? { ok: false, code } : { ok: false, code },
      status,
    );
  }
}
