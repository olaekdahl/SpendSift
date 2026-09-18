import type { NextRequest } from "next/server";

import { exportAccountSchema } from "@/features/privacy/schema";
import { getAuthenticatedUser } from "@/server/auth";
import {
  AccountSecurityError,
  beginAccountAction,
  exportCurrentUserData,
  finishAccountAction,
} from "@/server/account-security";
import {
  AccountRequestError,
  accountNetworkFingerprint,
  readAccountJson,
  validateAccountRequest,
} from "@/server/account-request";

export const runtime = "nodejs";

function jsonError(code: string, status: number) {
  return Response.json(
    { ok: false, code },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return jsonError("AUTH_REQUIRED", 401);

  let attemptId: string | null = null;
  try {
    validateAccountRequest(request);
    attemptId = await beginAccountAction(
      "export",
      accountNetworkFingerprint(request),
    );
    const result = exportAccountSchema.safeParse(
      await readAccountJson(request),
    );
    if (!result.success) throw new AccountRequestError("INVALID_REQUEST", 400);

    const data = await exportCurrentUserData(
      user,
      result.data.password,
      attemptId,
    );
    const body = JSON.stringify({
      ...((data && typeof data === "object" && !Array.isArray(data)
        ? data
        : {}) as object),
      account: { email: user.email },
    });
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="subtrack-export.json"',
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const code =
      error instanceof AccountRequestError
        ? error.code
        : error instanceof AccountSecurityError
          ? error.code
          : "EXPORT_FAILED";
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
    return jsonError(code, status);
  }
}
