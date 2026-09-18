import type { Metadata } from "next";
import { Download, FileCheck2, LockKeyhole, ScanSearch } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_NAME } from "@/config/app";
import { StatementReviewDemo } from "@/features/import/statement-review-demo";

export const metadata: Metadata = {
  title: "Import",
};

export default function ImportPage() {
  return (
    <>
      <PageHeader
        eyebrow="Fictional review exercise"
        title="Statement import"
        description={`Preview how ${APP_NAME} explains possible recurring charges before you approve anything. File processing starts in Phase 4.`}
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

      <Card className="mb-6 border-info/40 bg-info-soft p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-info"
          />
          <div>
            <h2 className="text-sm font-extrabold text-ink">
              Your raw statement does not become a permanent file
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              The planned importer validates and parses the file, keeps only
              normalized records needed for review, and discards the upload.
              Never use real financial data in this Phase 1 demo.
            </p>
          </div>
        </div>
      </Card>

      <ol className="mb-7 grid gap-3 sm:grid-cols-3" aria-label="Import steps">
        {[
          {
            icon: FileCheck2,
            step: "01",
            label: "Validate and map",
            state: "Planned",
          },
          {
            icon: ScanSearch,
            step: "02",
            label: "Find patterns",
            state: "Previewed",
          },
          {
            icon: FileCheck2,
            step: "03",
            label: "Review every match",
            state: "Try below",
          },
        ].map(({ icon: Icon, step, label, state }, index) => (
          <li
            key={step}
            className="flex items-center gap-3 border-b border-line pb-3"
          >
            <span
              className={
                index === 2
                  ? "grid size-10 place-items-center rounded-md bg-brand text-white"
                  : "grid size-10 place-items-center rounded-md bg-surface text-muted"
              }
            >
              <Icon aria-hidden="true" className="size-4.5" />
            </span>
            <span>
              <span className="block text-xs font-bold text-muted">
                {step} · {state}
              </span>
              <span className="mt-0.5 block text-sm font-extrabold text-ink">
                {label}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-extrabold text-ink">
          Possible recurring charges
        </h2>
        <Badge tone="warning">3 to review</Badge>
      </div>
      <StatementReviewDemo />
    </>
  );
}
