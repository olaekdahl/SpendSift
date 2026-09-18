"use client";

import { ArrowLeft, LoaderCircle, Save } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { CancellationGuideDto } from "@/server/dal/cancellation-guides";

import { saveCancellationGuideAction } from "./actions";
import { initialCancellationGuideActionState } from "./action-state";

const inputClassName =
  "h-11 w-full rounded-md border border-line bg-surface-raised px-3 text-sm text-ink";

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? (
    <p className="mt-1 text-xs font-semibold text-danger">{errors[0]}</p>
  ) : null;
}

export function CancellationGuideForm({
  subscriptionId,
  subscriptionName,
  guide,
}: {
  subscriptionId: string;
  subscriptionName: string;
  guide: CancellationGuideDto | null;
}) {
  const [state, action, pending] = useActionState(
    saveCancellationGuideAction,
    initialCancellationGuideActionState,
  );

  return (
    <Card className="overflow-hidden">
      <form action={action}>
        <input type="hidden" name="subscriptionId" value={subscriptionId} />
        <input
          type="hidden"
          name="expectedGuideUpdatedAt"
          value={guide?.updatedAt ?? ""}
        />
        <fieldset
          disabled={pending}
          className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6"
        >
          <div className="sm:col-span-2">
            <h2 className="text-lg font-extrabold text-ink">
              {subscriptionName}
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              This is your private reference. Saving guidance or opening a link
              does not cancel the service.
            </p>
          </div>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-ink">
              Cancellation URL
            </span>
            <input
              name="cancellationUrl"
              type="url"
              maxLength={2048}
              placeholder="https://example.com/account/cancel"
              defaultValue={guide?.cancellationUrl ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.cancellationUrl} />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-ink">
              Provider phone
            </span>
            <input
              name="phoneNumber"
              type="tel"
              maxLength={40}
              defaultValue={guide?.phoneNumber ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.phoneNumber} />
          </label>

          <label>
            <span className="mb-2 block text-sm font-bold text-ink">
              Last verified
            </span>
            <input
              name="verifiedAt"
              type="date"
              defaultValue={guide?.verifiedAt ?? ""}
              className={inputClassName}
            />
            <FieldError errors={state.fieldErrors?.verifiedAt} />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-ink">
              Instructions
            </span>
            <textarea
              name="instructions"
              rows={5}
              maxLength={4000}
              defaultValue={guide?.instructions ?? ""}
              className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
            />
            <FieldError errors={state.fieldErrors?.instructions} />
          </label>

          <label className="sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-ink">
              Private notes
            </span>
            <textarea
              name="userNotes"
              rows={4}
              maxLength={4000}
              defaultValue={guide?.userNotes ?? ""}
              className="w-full rounded-md border border-line bg-surface-raised px-3 py-2 text-sm text-ink"
            />
            <FieldError errors={state.fieldErrors?.userNotes} />
          </label>

          {state.message ? (
            <p
              role="alert"
              className="text-sm font-bold text-danger sm:col-span-2"
            >
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-between gap-3 sm:col-span-2">
            <Link
              href={`/subscriptions/${subscriptionId}`}
              className={buttonVariants({ variant: "ghost" })}
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back
            </Link>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle
                  aria-hidden="true"
                  className="size-4 animate-spin"
                />
              ) : (
                <Save aria-hidden="true" className="size-4" />
              )}
              Save guide
            </Button>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}
