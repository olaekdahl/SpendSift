import type { Metadata } from "next";
import { Database, Download, LockKeyhole, Trash2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy",
};

const sections = [
  {
    icon: Database,
    title: "Data kept locally",
    body: "SubTrack stores account preferences, subscription records, normalized transactions, import summaries, review decisions, reminders, savings values, cancellation guides, content-free audit events, and short-lived hashed network signals used for abuse limits in the configured Supabase project.",
  },
  {
    icon: LockKeyhole,
    title: "Statement handling",
    body: "CSV source bytes stay in bounded request memory and are not stored as files. Normalized transaction fields needed for review and duplicate detection remain until you reject them, discard an active import, or delete your account.",
  },
  {
    icon: Download,
    title: "Export",
    body: "You can download a versioned JSON copy of your account data after entering your current password. Exports include safe action-attempt metadata but exclude network fingerprints, passwords, authentication tokens, and source statement bytes.",
  },
  {
    icon: Trash2,
    title: "Deletion",
    body: "Account deletion requires your current password and an exact confirmation phrase. It removes the Auth user and cascades local owner records. A content-free receipt remains without an email, user ID, or financial details.",
  },
];

export default function PrivacyPage() {
  return (
    <main
      id="main-content"
      className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-16"
    >
      <PageHeader
        eyebrow="Privacy and data controls"
        title="Your data stays under your control"
        description="This page describes the local implementation. Production hosting, backup expiry, legal retention, and support access remain unresolved until deployment review."
        action={
          <Link
            href="/settings"
            className={buttonVariants({ variant: "secondary" })}
          >
            Account settings
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map(({ icon: Icon, title, body }) => (
          <Card key={title} className="p-5 sm:p-6">
            <Icon aria-hidden="true" className="size-5 text-brand-strong" />
            <h2 className="mt-4 text-base font-extrabold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </Card>
        ))}
      </div>

      <section className="mt-8 border-t border-line pt-6">
        <h2 className="text-lg font-extrabold text-ink">Current limitations</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
          Use only fictional data in this local release. SubTrack does not
          connect to banks, read email, send data to an AI service, cancel
          provider accounts, or deliver external notifications. Detection and
          savings estimates require your review.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
          Local rate-limit attempts are eligible for pruning after 24 hours when
          a later protected action runs. Account deletion removes attempts
          linked to that account. A deployed retention scheduler and backup
          expiry policy are not yet implemented.
        </p>
      </section>
    </main>
  );
}
