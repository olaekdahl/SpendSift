"use client";

import { BellRing, Check, LoaderCircle, X } from "lucide-react";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { ReminderNotification } from "@/features/reminders/notification-service";
import { updateReminderAction } from "@/features/insights/actions";
import { initialInsightActionState } from "@/features/insights/action-state";

const reminderTypeLabels: Record<ReminderNotification["type"], string> = {
  renewal: "Renewal reminder",
  trial_ending: "Trial ending",
  annual_renewal: "Annual renewal",
  price_increase: "Possible price increase",
  review_later: "Deferred review",
};

function ReminderRow({
  reminder,
  locale,
  timeZone,
}: {
  reminder: ReminderNotification;
  locale: string;
  timeZone: string;
}) {
  const [state, action, pending] = useActionState(
    updateReminderAction,
    initialInsightActionState,
  );
  const dueLabel = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(new Date(reminder.dueAt));

  return (
    <li className="border-b border-line px-5 py-4 last:border-b-0">
      <div className="flex items-start gap-3">
        <BellRing
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-brand-strong"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-ink">
            {reminder.label}
          </p>
          <p className="mt-0.5 text-xs text-muted">
            {reminderTypeLabels[reminder.type]} · {dueLabel}
          </p>
        </div>
        <div className="flex gap-1">
          {(["read", "dismissed"] as const).map((status) => (
            <form action={action} key={status}>
              <input type="hidden" name="reminderId" value={reminder.id} />
              <input
                type="hidden"
                name="expectedUpdatedAt"
                value={reminder.updatedAt}
              />
              <input type="hidden" name="status" value={status} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                disabled={pending}
                aria-label={`${status === "read" ? "Mark" : "Dismiss"} ${reminder.label}`}
                title={status === "read" ? "Mark read" : "Dismiss"}
              >
                {pending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : status === "read" ? (
                  <Check aria-hidden="true" className="size-4" />
                ) : (
                  <X aria-hidden="true" className="size-4" />
                )}
              </Button>
            </form>
          ))}
        </div>
      </div>
      {state.message ? (
        <p role="alert" className="mt-2 text-xs font-bold text-danger">
          {state.message}
        </p>
      ) : null}
    </li>
  );
}

export function ReminderList({
  reminders,
  locale,
  timeZone,
}: {
  reminders: ReminderNotification[];
  locale: string;
  timeZone: string;
}) {
  if (!reminders.length) {
    return (
      <p className="px-5 py-6 text-sm leading-6 text-muted">
        No pending in-app reminders.
      </p>
    );
  }

  return (
    <ul>
      {reminders.map((reminder) => (
        <ReminderRow
          key={reminder.id}
          reminder={reminder}
          locale={locale}
          timeZone={timeZone}
        />
      ))}
    </ul>
  );
}
