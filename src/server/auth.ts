import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export const getAuthenticatedUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    const claims = data?.claims;
    const subject = claims?.sub;

    if (error || !claims || typeof subject !== "string") {
      return null;
    }

    return {
      id: subject,
      email: typeof claims.email === "string" ? claims.email : null,
    };
  },
);

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  return user;
}
