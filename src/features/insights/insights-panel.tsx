"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Layers3,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/subscriptions/calculations";
import type {
  CategoryOverlap,
  PriceChangeCandidate,
} from "@/features/insights/calculations";

import { confirmPriceChangeAction } from "./actions";
import { initialInsightActionState } from "./action-state";

function PriceChangeCard({ candidate }: { candidate: PriceChangeCandidate }) {
  const [state, action, pending] = useActionState(
    confirmPriceChangeAction,
    initialInsightActionState,
  );
  const percentage = Math.abs(candidate.percentageBasisPoints) / 100;
  const IncreaseIcon =
    candidate.direction === "increase" ? ArrowUpRight : ArrowDownRight;

  return (
    <li className="border-b border-line px-5 py-4 last:border-b-0 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-extrabold text-ink">{candidate.displayName}</p>
            <Badge
              tone={candidate.direction === "increase" ? "warning" : "success"}
            >
              <IncreaseIcon aria-hidden="true" className="mr-1 size-3.5" />
              {percentage.toFixed(1)}% {candidate.direction}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Latest linked charge:{" "}
            {formatMoney(candidate.newAmountMinor, candidate.currency)} ·
            tracked price:{" "}
            {formatMoney(candidate.previousAmountMinor, candidate.currency)}
          </p>
        </div>
        <form action={action}>
          <input
            type="hidden"
            name="subscriptionId"
            value={candidate.subscriptionId}
          />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={candidate.expectedUpdatedAt}
          />
          <input
            type="hidden"
            name="expectedNewAmountMinor"
            value={candidate.newAmountMinor}
          />
          <Button type="submit" size="small" disabled={pending}>
            {pending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : null}
            Confirm price
          </Button>
        </form>
      </div>
      {state.message ? (
        <p role="alert" className="mt-2 text-xs font-bold text-danger">
          {state.message}
        </p>
      ) : null}
    </li>
  );
}

export function InsightsPanel({
  priceChanges,
  overlaps,
}: {
  priceChanges: PriceChangeCandidate[];
  overlaps: CategoryOverlap[];
}) {
  if (priceChanges.length === 0 && overlaps.length === 0) {
    return (
      <Card className="grid min-h-56 place-items-center p-6 text-center">
        <div>
          <span className="mx-auto grid size-10 place-items-center rounded-md bg-brand-soft text-brand-strong">
            <Layers3 aria-hidden="true" className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-extrabold text-ink">
            No urgent reviews
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Price changes and possible category overlaps appear here when the
            evidence meets your thresholds.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <h2 className="text-lg font-extrabold text-ink">Review insights</h2>
        <p className="mt-1 text-sm text-muted">
          These are signals, not confirmed duplicates or provider changes.
        </p>
      </div>
      {priceChanges.length ? (
        <ul>
          {priceChanges.map((candidate) => (
            <PriceChangeCard
              key={candidate.subscriptionId}
              candidate={candidate}
            />
          ))}
        </ul>
      ) : null}
      {overlaps.length ? (
        <div className="border-t border-line p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-extrabold text-ink">
              Possible overlaps
            </h3>
            <Link
              href="/settings"
              className="text-xs font-bold text-brand-strong"
            >
              Adjust threshold
            </Link>
          </div>
          <ul className="mt-3 grid gap-3">
            {overlaps.map((overlap) => (
              <li
                key={overlap.category}
                className="rounded-md bg-surface-raised p-3"
              >
                <p className="text-sm font-extrabold text-ink">
                  {overlap.category}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {overlap.subscriptions
                    .map((item) => item.displayName)
                    .join(", ")}{" "}
                  may serve similar needs. Review them before making any
                  cancellation decision.
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}
