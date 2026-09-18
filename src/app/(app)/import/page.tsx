import type { Metadata } from "next";
import { Check, Download, FileCheck2, ScanSearch } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { ImportReview } from "@/features/import/import-review";
import { StatementImportUploader } from "@/features/import/statement-import-uploader";
import { requireAuthenticatedUser } from "@/server/auth";
import { getStatementImportForUser } from "@/server/dal/imports";
import { getSubscriptionsForUser } from "@/server/dal/subscriptions";

export const metadata: Metadata = {
  title: "Import",
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<{ import?: string | string[] }>;
}) {
  const user = await requireAuthenticatedUser();
  const requestedImport = (await searchParams).import;
  const importId =
    typeof requestedImport === "string" && uuidPattern.test(requestedImport)
      ? requestedImport
      : undefined;
  const [statementImport, subscriptions] = await Promise.all([
    getStatementImportForUser(user.id, importId),
    getSubscriptionsForUser(user.id),
  ]);
  const reviewing = Boolean(statementImport);
  const completed = statementImport?.status === "completed";

  return (
    <>
      <PageHeader
        eyebrow="Private statement workspace"
        title="Statement import"
        description="Map a fictional CSV, review deterministic recurring-charge matches, and decide what becomes a subscription."
        action={
          <a
            href="/samples/demo-statement.csv"
            download
            className={buttonVariants({ variant: "secondary" })}
          >
            <Download aria-hidden="true" className="size-4" />
            Sample CSV
          </a>
        }
      />

      <ol className="mb-7 grid gap-3 sm:grid-cols-3" aria-label="Import steps">
        {[
          {
            icon: reviewing ? Check : FileCheck2,
            step: "01",
            label: "Validate and map",
            active: !reviewing,
            done: reviewing,
          },
          {
            icon: reviewing ? Check : ScanSearch,
            step: "02",
            label: "Find patterns",
            active: false,
            done: reviewing,
          },
          {
            icon: completed ? Check : FileCheck2,
            step: "03",
            label: completed ? "Review complete" : "Review every match",
            active: reviewing && !completed,
            done: completed,
          },
        ].map(({ icon: Icon, step, label, active, done }) => (
          <li
            key={step}
            className="flex items-center gap-3 border-b border-line pb-3"
          >
            <span
              className={
                active || done
                  ? "grid size-10 place-items-center rounded-md bg-brand text-white"
                  : "grid size-10 place-items-center rounded-md bg-surface text-muted"
              }
            >
              <Icon aria-hidden="true" className="size-4.5" />
            </span>
            <span>
              <span className="block text-xs font-bold text-muted">{step}</span>
              <span className="mt-0.5 block text-sm font-extrabold text-ink">
                {label}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {statementImport ? (
        <ImportReview
          statementImport={statementImport}
          mergeTargets={subscriptions.map((subscription) => ({
            id: subscription.id,
            displayName: subscription.displayName,
          }))}
        />
      ) : (
        <StatementImportUploader />
      )}
    </>
  );
}
