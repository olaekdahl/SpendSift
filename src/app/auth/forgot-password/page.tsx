import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { PasswordResetForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
      <p className="text-xs font-extrabold text-brand-strong uppercase">
        Account recovery
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
        Reset your password
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        Enter your email. The response stays the same whether or not an account
        exists.
      </p>
      <div className="mt-7">
        <PasswordResetForm />
      </div>
    </Card>
  );
}
