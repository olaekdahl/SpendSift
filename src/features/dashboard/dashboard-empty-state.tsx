import { FileUp, Plus } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DashboardEmptyState() {
  return (
    <Card className="grid min-h-[460px] place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-lg bg-brand-soft text-brand-strong">
          <Plus aria-hidden="true" className="size-6" />
        </span>
        <h2 className="mt-6 font-display text-3xl font-semibold text-ink">
          Build your first clear picture
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          Add a subscription manually or review a statement import. Nothing
          becomes a confirmed subscription without your approval.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/subscriptions/new" className={buttonVariants()}>
            <Plus aria-hidden="true" className="size-4" />
            Add manually
          </Link>
          <Link
            href="/import"
            className={buttonVariants({ variant: "secondary" })}
          >
            <FileUp aria-hidden="true" className="size-4" />
            Review an import
          </Link>
        </div>
      </div>
    </Card>
  );
}
