import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { UpdatePasswordForm } from "@/features/auth/auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default function UpdatePasswordPage() {
  return (
    <Card className="mx-auto w-full max-w-md p-6 sm:p-8">
      <p className="text-xs font-extrabold text-brand-strong uppercase">
        Account recovery
      </p>
      <h1 className="mt-3 font-display text-4xl font-semibold text-ink">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted">
        This page works only after you open a valid password-reset link.
      </p>
      <div className="mt-7">
        <UpdatePasswordForm />
      </div>
    </Card>
  );
}
