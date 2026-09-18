import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { SignUpForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
      <p className="text-xs font-extrabold text-brand-strong uppercase">
        Private by default
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Your records stay separated from every other account.
      </p>
      <div className="mt-7">
        <SignUpForm />
      </div>
    </Card>
  );
}
