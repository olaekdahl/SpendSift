"use client";

import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { SubscriptionListItem } from "./browser-data";
import { formatMoney } from "./calculations";
import { formatDisplayDate, frequencyLabels } from "./presentation";
import type { SubscriptionStatus } from "./schema";
import { SubscriptionStatusBadge } from "./status-badge";

type StatusFilter = "all" | SubscriptionStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "trial", label: "Trials" },
  { value: "paused", label: "Paused" },
];

export function SubscriptionExplorer({
  subscriptions,
}: {
  subscriptions: readonly SubscriptionListItem[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const categories = [
    ...new Set(subscriptions.map((subscription) => subscription.category)),
  ];

  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const matchesQuery =
      !deferredQuery ||
      subscription.displayName.toLowerCase().includes(deferredQuery);
    const matchesCategory =
      category === "all" || subscription.category === category;
    const matchesStatus = status === "all" || subscription.status === status;

    return matchesQuery && matchesCategory && matchesStatus;
  });

  return (
    <>
      <Card className="mb-5 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative block flex-1">
            <span className="sr-only">Search subscriptions</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by service name"
              className="h-11 w-full rounded-md border border-line bg-surface-raised pr-4 pl-10 text-sm text-ink placeholder:text-muted"
            />
          </label>

          <label className="relative block lg:w-56">
            <span className="sr-only">Filter by category</span>
            <SlidersHorizontal
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-11 w-full appearance-none rounded-md border border-line bg-surface-raised pr-9 pl-10 text-sm font-semibold text-ink"
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          className="mt-4 flex gap-1 overflow-x-auto"
          aria-label="Filter by status"
        >
          {statusFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
              className={cn(
                "h-9 shrink-0 rounded-md px-3 text-sm font-bold transition-colors",
                status === filter.value
                  ? "bg-ink text-surface"
                  : "text-muted hover:bg-surface-raised hover:text-ink",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="mb-3 flex items-center justify-between px-1">
        <p className="text-sm font-semibold text-muted" aria-live="polite">
          {filteredSubscriptions.length}{" "}
          {filteredSubscriptions.length === 1
            ? "subscription"
            : "subscriptions"}
        </p>
        <p className="hidden text-xs text-muted sm:block">
          Amounts include monthly equivalents
        </p>
      </div>

      {filteredSubscriptions.length === 0 ? (
        <Card className="grid min-h-64 place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-md bg-surface-raised text-muted">
              <Search aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-extrabold text-ink">
              No subscriptions match
            </h2>
            <p className="mt-2 text-sm text-muted">
              Change the search or filter to see other records.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {filteredSubscriptions.map((subscription) => (
              <Link
                key={subscription.id}
                href={`/subscriptions/${subscription.id}`}
                className="rounded-lg"
              >
                <Card className="p-4 transition-colors hover:bg-surface-raised">
                  <div className="flex items-start gap-3">
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-md text-sm font-extrabold text-white"
                      style={{ backgroundColor: subscription.brandColor }}
                    >
                      {subscription.displayName.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span>
                          <span className="block truncate text-sm font-extrabold text-ink">
                            {subscription.displayName}
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            {subscription.category}
                          </span>
                        </span>
                        <SubscriptionStatusBadge status={subscription.status} />
                      </span>
                      <span className="mt-4 flex items-end justify-between gap-3">
                        <span className="text-xs text-muted">
                          Next {formatDisplayDate(subscription.nextBillingDate)}
                        </span>
                        <span className="text-right">
                          <span className="block text-base font-extrabold text-ink">
                            {formatMoney(
                              subscription.amountMinor,
                              subscription.currency,
                            )}
                          </span>
                          <span className="block text-[11px] text-muted">
                            {frequencyLabels[subscription.frequency]}
                          </span>
                        </span>
                      </span>
                    </span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead className="bg-surface-raised text-xs font-bold text-muted">
                  <tr>
                    <th scope="col" className="px-5 py-3.5">
                      Service
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Status
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Next charge
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Price
                    </th>
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Monthly
                    </th>
                    <th scope="col" className="w-14 px-4 py-3.5">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {filteredSubscriptions.map((subscription) => (
                    <tr
                      key={subscription.id}
                      className="hover:bg-surface-raised"
                    >
                      <th scope="row" className="px-5 py-4 font-normal">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid size-10 shrink-0 place-items-center rounded-md text-sm font-extrabold text-white"
                            style={{ backgroundColor: subscription.brandColor }}
                          >
                            {subscription.displayName.charAt(0)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-extrabold text-ink">
                              {subscription.displayName}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {subscription.category}
                            </span>
                          </span>
                        </div>
                      </th>
                      <td className="px-4 py-4">
                        <SubscriptionStatusBadge status={subscription.status} />
                      </td>
                      <td className="px-4 py-4 text-sm text-muted">
                        {formatDisplayDate(subscription.nextBillingDate)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="block text-sm font-extrabold text-ink">
                          {formatMoney(
                            subscription.amountMinor,
                            subscription.currency,
                          )}
                        </span>
                        <span className="block text-xs text-muted">
                          {frequencyLabels[subscription.frequency]}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-ink">
                        {formatMoney(
                          subscription.monthlyAmountMinor,
                          subscription.currency,
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          href={`/subscriptions/${subscription.id}`}
                          aria-label={`View ${subscription.displayName}`}
                          className="inline-grid size-9 place-items-center rounded-md text-muted hover:bg-brand-soft hover:text-brand-strong"
                        >
                          <ArrowRight aria-hidden="true" className="size-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
