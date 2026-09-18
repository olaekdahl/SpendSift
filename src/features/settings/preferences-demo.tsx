"use client";

import {
  BellRing,
  Check,
  Globe2,
  LoaderCircle,
  MoonStar,
  PiggyBank,
  WalletCards,
} from "lucide-react";
import { useActionState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { updatePreferencesAction } from "@/features/onboarding/actions";
import { formatMinorUnitsForInput } from "@/features/onboarding/schema";
import { initialOnboardingState } from "@/features/onboarding/state";

import type { SettingsPreferences } from "./browser-data";

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

export function PreferencesDemo({ profile }: { profile: SettingsPreferences }) {
  const [state, action, pending] = useActionState(
    updatePreferencesAction,
    initialOnboardingState,
  );

  return (
    <form action={action} className="space-y-5">
      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <h2 className="text-lg font-extrabold text-ink">Money preferences</h2>
          <p className="mt-1 text-sm text-muted">
            These choices apply to your private workspace.
          </p>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-3 sm:p-6">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <Globe2 aria-hidden="true" className="size-4 text-muted" />
              Currency
            </span>
            <select
              name="preferredCurrency"
              className="h-11 w-full rounded-md border border-line bg-surface-raised px-3 text-sm text-ink"
              defaultValue={profile.currency}
            >
              <option value="USD">USD · US dollar</option>
              <option value="EUR" disabled>
                EUR · Planned
              </option>
              <option value="GBP" disabled>
                GBP · Planned
              </option>
            </select>
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <WalletCards aria-hidden="true" className="size-4 text-muted" />
              Monthly budget
            </span>
            <span className="relative block">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
                $
              </span>
              <input
                name="monthlyBudget"
                type="text"
                inputMode="decimal"
                defaultValue={formatMinorUnitsForInput(
                  profile.monthlyBudgetMinor,
                )}
                className="h-11 w-full rounded-md border border-line bg-surface-raised pr-3 pl-7 text-sm text-ink"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <PiggyBank aria-hidden="true" className="size-4 text-muted" />
              Monthly savings goal
            </span>
            <span className="relative block">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">
                $
              </span>
              <input
                name="monthlySavingsGoal"
                type="text"
                inputMode="decimal"
                defaultValue={formatMinorUnitsForInput(
                  profile.monthlySavingsGoalMinor,
                )}
                className="h-11 w-full rounded-md border border-line bg-surface-raised pr-3 pl-7 text-sm text-ink"
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Time zone
            </span>
            <select
              name="timeZone"
              defaultValue={profile.timeZone}
              className="h-11 w-full rounded-md border border-line bg-surface-raised px-3 text-sm text-ink"
            >
              {timeZones.map((timeZone) => (
                <option key={timeZone} value={timeZone}>
                  {timeZone.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      <input type="hidden" name="locale" value={profile.locale} />

      <Card className="overflow-hidden">
        <div className="border-b border-line px-5 py-5 sm:px-6">
          <h2 className="text-lg font-extrabold text-ink">
            Appearance and reminders
          </h2>
        </div>
        <div className="divide-y divide-line">
          <div className="flex min-h-20 items-center gap-3 px-5 py-4 sm:px-6">
            <MoonStar
              aria-hidden="true"
              className="size-5 shrink-0 text-muted"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-ink">
                Color theme
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                Switch between light and dark themes
              </span>
            </span>
            <ThemeToggle />
          </div>
          {[
            {
              label: "Renewal reminders",
              description: "Show in-app notices before upcoming charges",
              name: "renewalRemindersEnabled",
              defaultChecked: profile.renewalRemindersEnabled,
            },
            {
              label: "Trial reminders",
              description: "Show in-app notices before trials expire",
              name: "trialRemindersEnabled",
              defaultChecked: profile.trialRemindersEnabled,
            },
          ].map((preference) => (
            <label
              key={preference.label}
              className="flex min-h-20 cursor-pointer items-center gap-3 px-5 py-4 sm:px-6"
            >
              <BellRing
                aria-hidden="true"
                className="size-5 shrink-0 text-muted"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-extrabold text-ink">
                  {preference.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {preference.description}
                </span>
              </span>
              <input
                name={preference.name}
                type="checkbox"
                defaultChecked={preference.defaultChecked}
                className="size-5 accent-[var(--brand)]"
              />
            </label>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <span
          className="text-sm font-semibold text-brand-strong"
          aria-live="polite"
        >
          {state.message ?? ""}
        </span>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Check aria-hidden="true" className="size-4" />
          )}
          Save preferences
        </Button>
      </div>
    </form>
  );
}
