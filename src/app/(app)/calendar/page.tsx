import type { Metadata } from "next";
import { CalendarCheck2, Clock3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/subscriptions/calculations";
import { demoSubscriptions } from "@/features/subscriptions/demo-data";
import { frequencyLabels } from "@/features/subscriptions/presentation";

export const metadata: Metadata = {
  title: "Calendar",
};

const months = [
  { key: "2026-09", label: "September 2026" },
  { key: "2026-10", label: "October 2026" },
];

export default function CalendarPage() {
  const upcoming = demoSubscriptions
    .filter(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trial",
    )
    .slice()
    .sort((first, second) =>
      first.nextBillingDate.localeCompare(second.nextBillingDate),
    );
  const upcomingTotalMinor = upcoming.reduce(
    (total, subscription) => total + subscription.amountMinor,
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow="Next 30 days"
        title="Renewal calendar"
        description="See upcoming fictional charges and trial dates in chronological order."
        action={<Badge tone="warning">6 upcoming</Badge>}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-7">
          {months.map((month) => {
            const entries = upcoming.filter((subscription) =>
              subscription.nextBillingDate.startsWith(month.key),
            );

            return (
              <section key={month.key} aria-labelledby={`month-${month.key}`}>
                <h2
                  id={`month-${month.key}`}
                  className="mb-3 text-sm font-extrabold text-ink"
                >
                  {month.label}
                </h2>
                <Card className="overflow-hidden">
                  <ol className="divide-y divide-line">
                    {entries.map((subscription) => {
                      const date = new Date(
                        `${subscription.nextBillingDate}T12:00:00Z`,
                      );

                      return (
                        <li
                          key={subscription.id}
                          className="flex items-center gap-4 p-4 sm:px-5"
                        >
                          <time
                            dateTime={subscription.nextBillingDate}
                            className="grid size-12 shrink-0 place-items-center rounded-md bg-surface-raised text-center"
                          >
                            <span className="block text-[10px] font-extrabold text-muted uppercase">
                              {new Intl.DateTimeFormat("en-US", {
                                month: "short",
                                timeZone: "UTC",
                              }).format(date)}
                            </span>
                            <span className="-mt-2 block text-lg font-extrabold text-ink">
                              {date.getUTCDate()}
                            </span>
                          </time>
                          <span
                            className="grid size-10 shrink-0 place-items-center rounded-md text-sm font-extrabold text-white"
                            style={{ backgroundColor: subscription.brandColor }}
                          >
                            {subscription.displayName.charAt(0)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-extrabold text-ink">
                              {subscription.displayName}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {frequencyLabels[subscription.frequency]}
                            </span>
                          </span>
                          <span className="text-right">
                            <span className="block text-sm font-extrabold text-ink">
                              {formatMoney(subscription.amountMinor)}
                            </span>
                            {subscription.status === "trial" ? (
                              <Badge tone="warning" className="mt-1">
                                Trial
                              </Badge>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </Card>
              </section>
            );
          })}
        </div>

        <aside className="space-y-4">
          <Card className="p-5">
            <span className="grid size-10 place-items-center rounded-md bg-brand-soft text-brand-strong">
              <CalendarCheck2 aria-hidden="true" className="size-5" />
            </span>
            <p className="mt-5 text-sm font-semibold text-muted">
              Next 30 days
            </p>
            <p className="mt-1 font-display text-4xl font-semibold text-ink">
              {formatMoney(upcomingTotalMinor)}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Six charges, including one annual renewal
            </p>
          </Card>
          <Card className="border-warning/40 bg-warning-soft p-5">
            <Clock3 aria-hidden="true" className="size-5 text-warning" />
            <h2 className="mt-4 text-base font-extrabold text-ink">
              Trial reminder
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Form & Flow ends its trial on September 23, before the annual
              charge.
            </p>
          </Card>
        </aside>
      </div>
    </>
  );
}
