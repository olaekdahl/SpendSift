"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { completeOnboardingAction } from "./actions";
import { initialOnboardingState } from "./state";

const timeZones = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Stockholm",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? (
    <p className="mt-1 text-xs font-semibold text-danger">{errors[0]}</p>
  ) : null;
}

export function OnboardingForm() {
  const [state, action, pending] = useActionState(
    completeOnboardingAction,
    initialOnboardingState,
  );

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">
            Preferred currency
          </span>
          <select
            name="preferredCurrency"
            defaultValue="USD"
            className="h-12 w-full rounded-md border border-line bg-surface-raised px-3 text-base text-ink"
          >
            <option value="USD">USD · US dollar</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">
            Time zone
          </span>
          <select
            name="timeZone"
            defaultValue="UTC"
            className="h-12 w-full rounded-md border border-line bg-surface-raised px-3 text-base text-ink"
          >
            {timeZones.map((timeZone) => (
              <option key={timeZone} value={timeZone}>
                {timeZone.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <FieldError errors={state.fieldErrors?.timeZone} />
        </label>
      </div>

      <input type="hidden" name="locale" value="en-US" />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">
            Monthly budget
          </span>
          <span className="relative block">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">
              $
            </span>
            <input
              name="monthlyBudget"
              type="text"
              inputMode="decimal"
              defaultValue="85.00"
              className="h-12 w-full rounded-md border border-line bg-surface-raised pr-3 pl-7 text-base text-ink"
            />
          </span>
          <FieldError errors={state.fieldErrors?.monthlyBudgetMinor} />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-bold text-ink">
            Monthly savings goal
          </span>
          <span className="relative block">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted">
              $
            </span>
            <input
              name="monthlySavingsGoal"
              type="text"
              inputMode="decimal"
              defaultValue="25.00"
              className="h-12 w-full rounded-md border border-line bg-surface-raised pr-3 pl-7 text-base text-ink"
            />
          </span>
          <FieldError errors={state.fieldErrors?.monthlySavingsGoalMinor} />
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-bold text-ink">
          In-app reminders
        </legend>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-3">
          <input
            name="renewalRemindersEnabled"
            type="checkbox"
            defaultChecked
            className="size-5 accent-[var(--brand)]"
          />
          <span className="text-sm font-semibold text-ink">
            Upcoming renewals
          </span>
        </label>
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-line px-4 py-3">
          <input
            name="trialRemindersEnabled"
            type="checkbox"
            defaultChecked
            className="size-5 accent-[var(--brand)]"
          />
          <span className="text-sm font-semibold text-ink">
            Trials ending soon
          </span>
        </label>
      </fieldset>

      {state.message ? (
        <p
          role="alert"
          className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : null}
        Save and continue
        {!pending ? <ArrowRight aria-hidden="true" className="size-4" /> : null}
      </Button>
    </form>
  );
}
