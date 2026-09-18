import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Authentication link expired" };

export default function AuthErrorPage() {
  return (
    <Card className="mx-auto w-full max-w-md p-6 text-center sm:p-8">
      <h1 className="font-display text-4xl font-semibold text-ink">
        This link is not valid
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        The link may have expired or already been used. Request a new message
        and try again.
      </p>
      <Link
        href="/auth/sign-in"
        className={buttonVariants({ className: "mt-6" })}
      >
        Return to sign in
      </Link>
    </Card>
  );
}
