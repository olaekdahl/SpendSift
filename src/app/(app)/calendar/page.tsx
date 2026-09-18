import type { Metadata } from "next";
import { CalendarCheck2, Clock3 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/subscriptions/calculations";
import { frequencyLabels } from "@/features/subscriptions/presentation";
import { requireAuthenticatedUser } from "@/server/auth";
import { getProfileForUser } from "@/server/dal/profiles";
import { getSubscriptionsForUser } from "@/server/dal/subscriptions";

export const metadata: Metadata = {
  title: "Calendar",
};

export default async function CalendarPage() {
  const user = await requireAuthenticatedUser();
  const [profile, subscriptions] = await Promise.all([
    getProfileForUser(user.id),
    getSubscriptionsForUser(user.id),
  ]);
  const today = new Date();
  const horizon = new Date(today);
  horizon.setUTCDate(horizon.getUTCDate() + 30);
  const upcoming = subscriptions
    .filter(
      (subscription) =>
        (subscription.status === "active" || subscription.status === "trial") &&
        new Date(`${subscription.nextBillingDate}T12:00:00Z`) >= today &&
        new Date(`${subscription.nextBillingDate}T12:00:00Z`) <= horizon,
    )
    .slice()
    .sort((first, second) =>
      first.nextBillingDate.localeCompare(second.nextBillingDate),
    );
  const upcomingTotalMinor = upcoming.reduce(
    (total, subscription) => total + subscription.amountMinor,
    0,
  );
  const monthKeys = [
    ...new Set(upcoming.map((item) => item.nextBillingDate.slice(0, 7))),
  ];
  const trial = upcoming.find(
    (subscription) => subscription.status === "trial",
  );

  return (
    <>
      <PageHeader
        eyebrow="Next 30 days"
        title="Renewal calendar"
        description="See upcoming charges and trial dates in chronological order."
        action={
          <Badge tone={upcoming.length ? "warning" : "neutral"}>
            {upcoming.length} upcoming
          </Badge>
        }
      />

      {upcoming.length === 0 ? (
        <Card className="grid min-h-72 place-items-center p-8 text-center">
          <div>
            <CalendarCheck2
              aria-hidden="true"
              className="mx-auto size-8 text-brand-strong"
            />
            <h2 className="mt-4 text-lg font-extrabold text-ink">
              No charges in the next 30 days
            </h2>
            <p className="mt-2 text-sm text-muted">
              Upcoming renewals appear here after you add subscriptions.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-7">
            {monthKeys.map((monthKey) => {
              const monthDate = new Date(`${monthKey}-01T12:00:00Z`);
              const monthLabel = new Intl.DateTimeFormat(profile.locale, {
                month: "long",
                year: "numeric",
                timeZone: profile.timeZone,
              }).format(monthDate);
              const entries = upcoming.filter((subscription) =>
                subscription.nextBillingDate.startsWith(monthKey),
              );

              return (
                <section key={monthKey} aria-labelledby={`month-${monthKey}`}>
                  <h2
                    id={`month-${monthKey}`}
                    className="mb-3 text-sm font-extrabold text-ink"
                  >
                    {monthLabel}
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
                                  timeZone: profile.timeZone,
                                }).format(date)}
                              </span>
                              <span className="-mt-2 block text-lg font-extrabold text-ink">
                                {date.getUTCDate()}
                              </span>
                            </time>
                            <span
                              className="grid size-10 shrink-0 place-items-center rounded-md text-sm font-extrabold text-white"
                              style={{
                                backgroundColor: subscription.brandColor,
                              }}
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
                                {formatMoney(
                                  subscription.amountMinor,
                                  subscription.currency,
                                  profile.locale,
                                )}
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
                {formatMoney(
                  upcomingTotalMinor,
                  profile.currency,
                  profile.locale,
                )}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted">
                {upcoming.length} {upcoming.length === 1 ? "charge" : "charges"}{" "}
                scheduled
              </p>
            </Card>
            {trial ? (
              <Card className="border-warning/40 bg-warning-soft p-5">
                <Clock3 aria-hidden="true" className="size-5 text-warning" />
                <h2 className="mt-4 text-base font-extrabold text-ink">
                  Trial reminder
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {trial.displayName} has a trial date approaching. Confirm any
                  cancellation directly with the provider.
                </p>
              </Card>
            ) : null}
          </aside>
        </div>
      )}
    </>
  );
}
