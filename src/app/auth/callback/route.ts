import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSafeNextPath } from "@/features/auth/schemas";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "recovery",
  "signup",
]);

export async function GET(request: NextRequest) {
  const nextPath = getSafeNextPath(request.nextUrl.searchParams.get("next"));
  const successResponse = NextResponse.redirect(new URL(nextPath, request.url));
  const { url, publishableKey } = getSupabasePublicConfig();
  const supabase = createServerClient<Database>(url, publishableKey, {
    cookieOptions: {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value, options }) => {
          successResponse.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          });
        });
        Object.entries(cacheHeaders).forEach(([name, value]) =>
          successResponse.headers.set(name, value),
        );
      },
    },
  });

  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  let error: Error | null = null;

  if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else if (tokenHash && type && emailOtpTypes.has(type)) {
    ({ error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    }));
  } else {
    error = new Error("Missing authentication confirmation parameters");
  }

  if (error) {
    return NextResponse.redirect(new URL("/auth/error", request.url));
  }

  return successResponse;
}
