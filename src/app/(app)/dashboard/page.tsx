import type { Metadata } from "next";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CircleDollarSign,
  Clock3,
  CreditCard,
  PiggyBank,
  ReceiptText,
  TrendingUp,
  UsersRound,
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
  getPriceIncrease,
} from "@/features/subscriptions/calculations";
import {
  demoBudgetMinor,
  demoSpentThisMonthMinor,
  demoSubscriptions,
} from "@/features/subscriptions/demo-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  const summary = getDashboardSummary(demoSubscriptions, demoBudgetMinor);
  const budgetPercentage = Math.round(
    (summary.monthlyCostMinor / demoBudgetMinor) * 100,
  );
  const upcoming = demoSubscriptions
    .filter(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trial",
    )
    .slice()
    .sort((first, second) =>
      first.nextBillingDate.localeCompare(second.nextBillingDate),
    )
    .slice(0, 4);
  const increasedSubscription = demoSubscriptions.find(
    (subscription) => subscription.previousAmountMinor,
  );
  const priceIncrease = increasedSubscription
    ? getPriceIncrease(increasedSubscription)
    : null;

  if (demoSubscriptions.length === 0) {
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
        eyebrow="Thursday, September 17"
        title="Good morning"
        description="Here is what your fictional subscriptions are doing this month."
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
            value={formatMoney(summary.monthlyCostMinor)}
            detail="Across active plans and trials"
            icon={CreditCard}
            tone="brand"
          />
          <StatCard
            label="Annual estimate"
            value={formatMoney(summary.annualCostMinor)}
            detail="At current billing rates"
            icon={ReceiptText}
            tone="info"
          />
          <StatCard
            label="Active subscriptions"
            value={String(summary.activeCount)}
            detail="Five active and one trial"
            icon={CircleDollarSign}
          />
          <StatCard
            label="Budget remaining"
            value={formatMoney(summary.budgetRemainingMinor)}
            detail={`${budgetPercentage}% of your $85 budget planned`}
            icon={PiggyBank}
            tone="brand"
          />
          <StatCard
            label="Potential savings"
            value={formatMoney(summary.potentialSavingsMinor)}
            detail="From two plans under review"
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
            <Badge tone="success">On track</Badge>
          </div>
          <div className="mb-3 flex items-end justify-between gap-4">
            <p className="font-display text-4xl font-semibold text-ink">
              {formatMoney(summary.monthlyCostMinor)}
              <span className="ml-2 font-sans text-sm font-semibold text-muted">
                of $85.00
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
                {formatMoney(demoSpentThisMonthMinor)}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted">Room left</p>
              <p className="mt-1 text-lg font-extrabold text-brand-strong">
                {formatMoney(summary.budgetRemainingMinor)}
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
          <SpendingChart subscriptions={demoSubscriptions} />
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
                  {formatMoney(subscription.amountMinor)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
          <Card className="border-warning/40 bg-warning-soft p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface text-warning">
                <Clock3 aria-hidden="true" className="size-4.5" />
              </span>
              <div>
                <Badge tone="warning">Trial ends in 6 days</Badge>
                <h2 className="mt-3 text-base font-extrabold text-ink">
                  Form & Flow
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  The annual plan renews at $89.99 on October 5.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-danger-soft text-danger">
                <AlertTriangle aria-hidden="true" className="size-4.5" />
              </span>
              <div>
                <Badge tone="danger">Price change</Badge>
                <h2 className="mt-3 text-base font-extrabold text-ink">
                  Northstar Cinema
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Increased from{" "}
                  {priceIncrease
                    ? formatMoney(priceIncrease.previousAmountMinor)
                    : "$0.00"}{" "}
                  to{" "}
                  {priceIncrease
                    ? formatMoney(priceIncrease.currentAmountMinor)
                    : "$0.00"}
                  .
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:col-span-2 xl:col-span-1">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-info-soft text-info">
                <UsersRound aria-hidden="true" className="size-4.5" />
              </span>
              <div>
                <Badge tone="info">Possible overlap</Badge>
                <h2 className="mt-3 text-base font-extrabold text-ink">
                  Two video services
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Northstar Cinema and ViewBox Plus cost $31.98 each month
                  together.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-lg border border-line bg-surface-raised px-4 py-4 text-sm leading-6 text-muted">
        <CalendarClock
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-brand-strong"
        />
        <p>
          Demo estimates use fictional records. Subscription detection and
          savings estimates can be incomplete or inaccurate and always require
          your review.
        </p>
      </div>
    </>
  );
}
