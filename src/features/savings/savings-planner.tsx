"use client";

import { CheckCircle2, LoaderCircle, PiggyBank } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmProviderCancellationAction } from "@/features/insights/actions";
import { initialInsightActionState } from "@/features/insights/action-state";
import type { SavingsPlanItem } from "@/features/subscriptions/browser-data";
import { formatMoney } from "@/features/subscriptions/calculations";

function ProviderCancellationForm({
  subscription,
}: {
  subscription: SavingsPlanItem;
}) {
  const [state, action, pending] = useActionState(
    confirmProviderCancellationAction,
    initialInsightActionState,
  );

  if (!subscription.updatedAt) return null;

  return (
    <details className="border-t border-line px-5 py-3 sm:px-6">
      <summary className="cursor-pointer text-xs font-bold text-muted">
        Record provider-confirmed cancellation
      </summary>
      <form action={action} className="mt-3 flex flex-wrap items-center gap-3">
        <input type="hidden" name="subscriptionId" value={subscription.id} />
        <input
          type="hidden"
          name="expectedUpdatedAt"
          value={subscription.updatedAt}
        />
        <label className="flex flex-1 items-start gap-2 text-xs leading-5 text-muted">
          <input
            type="checkbox"
            name="confirmation"
            value="provider-confirmed"
            required
            className="mt-0.5 size-4 shrink-0 accent-brand"
          />
          I confirm the provider, not SubTrack, has cancelled this service.
        </label>
        <Button type="submit" variant="danger" size="small" disabled={pending}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : null}
          Record cancellation
        </Button>
      </form>
      {state.message ? (
        <p role="alert" className="mt-2 text-xs font-bold text-danger">
          {state.message}
        </p>
      ) : null}
    </details>
  );
}

export function SavingsPlanner({
  subscriptions,
  realizedSavingsMinor,
  monthlyGoalMinor,
  currency,
  locale,
}: {
  subscriptions: readonly SavingsPlanItem[];
  realizedSavingsMinor: number;
  monthlyGoalMinor: number | null;
  currency: string;
  locale: string;
}) {
  const [selectedIds, setSelectedIds] = useState(
    new Set(
      subscriptions
        .filter((subscription) => subscription.selectedByDefault)
        .map((subscription) => subscription.id),
    ),
  );
  const monthlySavingsMinor = subscriptions
    .filter((subscription) => selectedIds.has(subscription.id))
    .reduce(
      (total, subscription) => total + subscription.monthlyAmountMinor,
      0,
    );

  function toggleSubscription(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <h2 className="text-lg font-extrabold text-ink">
            Plans you are considering
          </h2>
          <p className="mt-1 text-sm text-muted">
            Select plans to estimate savings. This does not cancel them.
          </p>
        </div>
        <fieldset>
          <legend className="sr-only">
            Subscriptions to consider cancelling
          </legend>
          <div className="divide-y divide-line">
            {subscriptions.map((subscription) => {
              const selected = selectedIds.has(subscription.id);

              const checkboxId = `savings-${subscription.id}`;

              return (
                <div key={subscription.id}>
                  <label
                    htmlFor={checkboxId}
                    className="flex min-h-20 cursor-pointer items-center gap-3 px-5 py-4 hover:bg-surface-raised sm:px-6"
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleSubscription(subscription.id)}
                      className="size-5 shrink-0 accent-[var(--brand)]"
                    />
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
                        {subscription.category}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-extrabold text-ink">
                        {formatMoney(
                          subscription.monthlyAmountMinor,
                          subscription.currency,
                          locale,
                        )}
                      </span>
                      <span className="block text-xs text-muted">
                        per month
                      </span>
                    </span>
                  </label>
                  <ProviderCancellationForm subscription={subscription} />
                </div>
              );
            })}
          </div>
        </fieldset>
      </Card>

      <aside className="space-y-5">
        <Card className="bg-brand-strong p-6 text-white dark:bg-brand-soft dark:text-ink">
          <PiggyBank
            aria-hidden="true"
            className="size-6 text-[#b9ead2] dark:text-brand-strong"
          />
          <p className="mt-8 text-sm font-semibold text-[#d6eee3] dark:text-muted">
            Potential monthly savings
          </p>
          <output
            aria-live="polite"
            aria-label="Potential monthly savings total"
            className="mt-1 block font-display text-5xl font-semibold"
          >
            {formatMoney(monthlySavingsMinor, currency, locale)}
          </output>
          <p className="mt-3 text-sm text-[#d6eee3] dark:text-muted">
            {formatMoney(monthlySavingsMinor * 12, currency, locale)} over one
            year
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-brand-strong"
            />
            <div>
              <h2 className="text-base font-extrabold text-ink">
                Realized savings
              </h2>
              <p className="mt-1 text-2xl font-extrabold text-ink">
                {formatMoney(realizedSavingsMinor, currency, locale)}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Savings count as realized only after you mark a
                provider-confirmed cancellation. Monthly equivalents round to
                the nearest cent.
              </p>
              {monthlyGoalMinor !== null ? (
                <p className="mt-3 text-xs font-bold text-muted">
                  {Math.min(
                    100,
                    monthlyGoalMinor === 0
                      ? realizedSavingsMinor > 0
                        ? 100
                        : 0
                      : Math.round(
                          (realizedSavingsMinor * 100) / monthlyGoalMinor,
                        ),
                  )}
                  % of {formatMoney(monthlyGoalMinor, currency, locale)} goal
                </p>
              ) : null}
            </div>
          </div>
        </Card>
      </aside>
    </div>
  );
}
