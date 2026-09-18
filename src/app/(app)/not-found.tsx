import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ApplicationNotFound() {
  return (
    <Card className="grid min-h-80 place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-md bg-surface-raised text-muted">
          <SearchX aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-ink">
          This page could not be found.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The record may have been removed, or it may not belong to this
          account.
        </p>
        <Link
          href="/dashboard"
          className={buttonVariants({ className: "mt-6" })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Return to dashboard
        </Link>
      </div>
    </Card>
  );
}
