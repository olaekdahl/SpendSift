"use client";

import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { createSubscriptionAction, updateSubscriptionAction } from "./actions";
import { initialSubscriptionActionState } from "./action-state";
import type { SubscriptionEditorData } from "./editor-data";
import { formatMinorUnitsForSubscriptionInput } from "./form-schema";
import { frequencyLabels, statusLabels } from "./presentation";
import {
  billingFrequencies,
  subscriptionCategories,
  subscriptionStatuses,
} from "./schema";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? (
    <p className="mt-1 text-xs font-semibold text-danger">{errors[0]}</p>
  ) : null;
}

const inputClassName =
  "h-11 w-full rounded-md border border-line bg-surface-raised px-3 text-sm text-ink";

export function SubscriptionForm({
  mode,
  subscription,
  defaultDate,
}: {
  mode: "create" | "edit";
  subscription?: SubscriptionEditorData;
  defaultDate: string;
}) {
  const serverAction =
    mode === "create" ? createSubscriptionAction : updateSubscriptionAction;
  const [state, action, pending] = useActionState(
    serverAction,
    initialSubscriptionActionState,
  );
  const [frequency, setFrequency] = useState(
    subscription?.frequency ?? "monthly",
  );

  return (
    <form action={action}>
      {subscription ? (
        <>
          <input type="hidden" name="id" value={subscription.id} />
          <input
            type="hidden"
            name="expectedUpdatedAt"
            value={subscription.updatedAt}
          />
        </>
      ) : null}

      <fieldset disabled={pending} className="divide-y divide-line">
        <section className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-extrabold text-ink">Service details</h2>
            <p className="mt-1 text-sm text-muted">
              Use the name you recognize and the merchant text that appears on
              your statement.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Display name
            </span>
            <input
              name="displayName"
              required
              maxLength={120}
              defaultValue={subscription?.displayName ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.displayName} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Merchant name
            </span>
            <input
              name="merchantName"
              required
              maxLength={200}
              defaultValue={subscription?.merchantName ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.merchantName} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Category
            </span>
            <select
              name="category"
              defaultValue={subscription?.category ?? "Other"}
              className={inputClassName}
            >
              {subscriptionCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors?.category} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Status
            </span>
            <select
              name="status"
              defaultValue={subscription?.status ?? "active"}
              className={inputClassName}
            >
              {subscriptionStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors?.status} />
          </label>
        </section>

        <section className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-extrabold text-ink">
              Billing schedule
            </h2>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">Price</span>
            <span className="relative block">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">
                $
              </span>
              <input
                name="amountMinor"
                required
                inputMode="decimal"
                defaultValue={
                  subscription
                    ? formatMinorUnitsForSubscriptionInput(
                        subscription.amountMinor,
                      )
                    : ""
                }
                className={cn(inputClassName, "pl-7")}
              />
            </span>
            <FieldError errors={state.fieldErrors?.amountMinor} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Currency
            </span>
            <select
              name="currency"
              defaultValue={subscription?.currency ?? "USD"}
              className={inputClassName}
            >
              <option value="USD">USD · US dollar</option>
            </select>
            <FieldError errors={state.fieldErrors?.currency} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Billing frequency
            </span>
            <select
              name="frequency"
              value={frequency}
              onChange={(event) =>
                setFrequency(event.target.value as typeof frequency)
              }
              className={inputClassName}
            >
              {billingFrequencies.map((item) => (
                <option key={item} value={item}>
                  {frequencyLabels[item]}
                </option>
              ))}
            </select>
            <FieldError errors={state.fieldErrors?.frequency} />
          </label>

          {frequency === "custom" ? (
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-ink">
                Custom interval in days
              </span>
              <input
                name="customIntervalDays"
                type="number"
                min={1}
                max={3660}
                defaultValue={subscription?.customIntervalDays ?? ""}
                className={inputClassName}
              />
              <FieldError errors={state.fieldErrors?.customIntervalDays} />
            </label>
          ) : (
            <input type="hidden" name="customIntervalDays" value="" />
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Start date
            </span>
            <input
              name="startDate"
              type="date"
              required
              defaultValue={subscription?.startDate ?? defaultDate}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.startDate} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Next billing date
            </span>
            <input
              name="nextBillingDate"
              type="date"
              required
              defaultValue={subscription?.nextBillingDate ?? defaultDate}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.nextBillingDate} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Trial end date
            </span>
            <input
              name="trialEndDate"
              type="date"
              defaultValue={subscription?.trialEndDate ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.trialEndDate} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Reminder lead time
            </span>
            <input
              name="reminderLeadDays"
              type="number"
              min={0}
              max={365}
              required
              defaultValue={subscription?.reminderLeadDays ?? 7}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.reminderLeadDays} />
          </label>
        </section>

        <section className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <h2 className="text-lg font-extrabold text-ink">
              Payment and cancellation
            </h2>
            <p className="mt-1 text-sm text-muted">
              Store a nickname only. Never enter a full card or bank-account
              number.
            </p>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Payment method nickname
            </span>
            <input
              name="paymentMethodNickname"
              maxLength={80}
              defaultValue={subscription?.paymentMethodNickname ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.paymentMethodNickname} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Service website
            </span>
            <input
              name="website"
              type="url"
              maxLength={2048}
              placeholder="https://example.com"
              defaultValue={subscription?.website ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.website} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-ink">
              Cancellation URL
            </span>
            <input
              name="cancellationUrl"
              type="url"
              maxLength={2048}
              placeholder="https://example.com/account/cancel"
              defaultValue={subscription?.cancellationUrl ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.cancellationUrl} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-ink">
              Cancellation instructions
            </span>
            <textarea
              name="cancellationInstructions"
              maxLength={4000}
              rows={3}
              defaultValue={subscription?.cancellationInstructions ?? ""}
              className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
            />
            <FieldError errors={state.fieldErrors?.cancellationInstructions} />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-ink">Notes</span>
            <textarea
              name="notes"
              maxLength={4000}
              rows={4}
              defaultValue={subscription?.notes ?? ""}
              className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
            />
            <FieldError errors={state.fieldErrors?.notes} />
          </label>

          <p className="rounded-md bg-warning-soft p-3 text-sm leading-6 text-muted sm:col-span-2">
            Marking a record cancelled or deleting it here does not cancel the
            service. Cancellation is complete only when the provider confirms
            it.
          </p>
        </section>
      </fieldset>

      {state.message ? (
        <p
          role="alert"
          className="mx-5 mt-5 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger sm:mx-6"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t border-line p-5 sm:flex-row sm:justify-between sm:p-6">
        <Link
          href={
            subscription
              ? `/subscriptions/${subscription.id}`
              : "/subscriptions"
          }
          className={buttonVariants({ variant: "ghost" })}
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Cancel
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Save aria-hidden="true" className="size-4" />
          )}
          {mode === "create" ? "Add subscription" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
