import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { SignInForm } from "@/features/auth/auth-forms";
import { getSafeNextPath } from "@/features/auth/schemas";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/auth/sign-in">) {
  const params = await searchParams;
  const next = getSafeNextPath(params.next);

  return (
    <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
      <p className="text-xs font-extrabold text-brand-strong uppercase">
        Welcome back
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
        Sign in
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Access your private subscription workspace.
      </p>
      <div className="mt-7">
        <SignInForm next={next} />
      </div>
    </Card>
  );
}
