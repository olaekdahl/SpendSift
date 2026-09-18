import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  PiggyBank,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardEmptyState } from "@/features/dashboard/dashboard-empty-state";
import { SpendingChart } from "@/features/dashboard/spending-chart";
import { StatCard } from "@/features/dashboard/stat-card";
import {
  formatMoney,
  getDashboardSummary,
} from "@/features/subscriptions/calculations";
import { requireAuthenticatedUser } from "@/server/auth";
import { getProfileForUser } from "@/server/dal/profiles";
import { getSubscriptionsForUser } from "@/server/dal/subscriptions";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser();
  const [profile, subscriptions] = await Promise.all([
    getProfileForUser(user.id),
    getSubscriptionsForUser(user.id),
  ]);
  const budgetMinor = profile.monthlyBudgetMinor;
  const summary = getDashboardSummary(subscriptions, budgetMinor ?? 0);
  const budgetPercentage = budgetMinor
    ? Math.min(100, Math.round((summary.monthlyCostMinor / budgetMinor) * 100))
    : 0;
  const upcoming = subscriptions
    .filter(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trial",
    )
    .slice()
    .sort((first, second) =>
      first.nextBillingDate.localeCompare(second.nextBillingDate),
    )
    .slice(0, 4);
  const todayLabel = new Intl.DateTimeFormat(profile.locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: profile.timeZone,
  }).format(new Date());

  if (subscriptions.length === 0) {
    return (
      <>
        <PageHeader
          eyebrow="Welcome"
          title="Your subscription picture starts here"
          description="Add a subscription or review an import to begin tracking recurring costs."
        />
        <DashboardEmptyState />
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={todayLabel}
        title="Good morning"
        description="Here is what your subscriptions are doing this month."
        action={
          <Link href="/subscriptions" className={buttonVariants()}>
            View subscriptions
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      />

      <section aria-labelledby="overview-title">
        <h2 id="overview-title" className="sr-only">
          Subscription overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard
            label="Monthly estimate"
            value={formatMoney(
              summary.monthlyCostMinor,
              profile.currency,
              profile.locale,
            )}
            detail="Across active plans and trials"
            icon={CreditCard}
            tone="brand"
          />
          <StatCard
            label="Annual estimate"
            value={formatMoney(
              summary.annualCostMinor,
              profile.currency,
              profile.locale,
            )}
            detail="At current billing rates"
            icon={ReceiptText}
            tone="info"
          />
          <StatCard
            label="Active subscriptions"
            value={String(summary.activeCount)}
            detail="Active plans and trials"
            icon={CircleDollarSign}
          />
          <StatCard
            label="Budget remaining"
            value={
              budgetMinor === null
                ? "Not set"
                : formatMoney(
                    summary.budgetRemainingMinor,
                    profile.currency,
                    profile.locale,
                  )
            }
            detail={
              budgetMinor === null
                ? "Set a monthly limit in Settings"
                : `${budgetPercentage}% of your budget planned`
            }
            icon={PiggyBank}
            tone="brand"
          />
          <StatCard
            label="Potential savings"
            value={formatMoney(
              summary.potentialSavingsMinor,
              profile.currency,
              profile.locale,
            )}
            detail="From plans selected for review"
            icon={TrendingUp}
            tone="warning"
          />
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <Card className="p-5 sm:p-6">
          <div className="mb-7 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-ink">
                Monthly budget
              </h2>
              <p className="mt-1 text-sm text-muted">
                Planned recurring cost against your limit
              </p>
            </div>
            <Badge tone={budgetMinor === null ? "neutral" : "success"}>
              {budgetMinor === null ? "Not configured" : "On track"}
            </Badge>
          </div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <p className="font-display text-4xl font-semibold text-ink">
              {formatMoney(
                summary.monthlyCostMinor,
                profile.currency,
                profile.locale,
              )}
              <span className="ml-2 font-sans text-sm font-semibold text-muted">
                {budgetMinor === null
                  ? "without a budget"
                  : `of ${formatMoney(budgetMinor, profile.currency, profile.locale)}`}
              </span>
            </p>
            <span className="text-sm font-extrabold text-brand-strong">
              {budgetPercentage}%
            </span>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-surface-raised"
            role="progressbar"
            aria-label="Monthly subscription budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={budgetPercentage}
          >
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${budgetPercentage}%` }}
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5">
            <div>
              <p className="text-xs font-semibold text-muted">
                Spent this month
              </p>
              <p className="mt-1 text-lg font-extrabold text-ink">
                {formatMoney(0, profile.currency, profile.locale)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Room left</p>
              <p className="mt-1 text-lg font-extrabold text-brand-strong">
                {budgetMinor === null
                  ? "Not set"
                  : formatMoney(
                      summary.budgetRemainingMinor,
                      profile.currency,
                      profile.locale,
                    )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="mb-7 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-ink">
                Spending by category
              </h2>
              <p className="mt-1 text-sm text-muted">Monthly equivalent</p>
            </div>
            <span className="grid size-9 place-items-center rounded-md bg-info-soft text-info">
              <CircleDollarSign aria-hidden="true" className="size-4.5" />
            </span>
          </div>
          <SpendingChart subscriptions={subscriptions} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-5 sm:px-6">
            <div>
              <h2 className="text-lg font-extrabold text-ink">Coming up</h2>
              <p className="mt-1 text-sm text-muted">
                Renewals in the next 30 days
              </p>
            </div>
            <Link
              href="/calendar"
              className="rounded-md px-2 py-1 text-sm font-bold text-brand-strong hover:bg-brand-soft"
            >
              Full calendar
            </Link>
          </div>
          <ul className="divide-y divide-line">
            {upcoming.map((subscription) => (
              <li
                key={subscription.id}
                className="flex items-center gap-3 px-5 py-4 sm:px-6"
              >
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-md text-sm font-extrabold text-white"
                  style={{ backgroundColor: subscription.brandColor }}
                >
                  {subscription.displayName.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink">
                    {subscription.displayName}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    }).format(
                      new Date(`${subscription.nextBillingDate}T12:00:00Z`),
                    )}
                  </span>
                </span>
                <span className="text-sm font-extrabold text-ink">
                  {formatMoney(
                    subscription.amountMinor,
                    subscription.currency,
                    profile.locale,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="grid min-h-56 place-items-center p-6 text-center">
          <div>
            <span className="mx-auto grid size-10 place-items-center rounded-md bg-brand-soft text-brand-strong">
              <CalendarClock aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 text-base font-extrabold text-ink">
              No urgent reviews
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
              Price changes and possible overlaps appear here after matching
              transaction history is available.
            </p>
          </div>
        </Card>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-line bg-surface-raised px-4 py-4 text-sm leading-6 text-muted">
        <CalendarClock
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-brand-strong"
        />
        <p>
          Subscription detection and savings estimates can be incomplete or
          inaccurate and always require your review.
        </p>
      </div>
    </>
  );
}
