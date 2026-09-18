"use client";

import { Archive, LoaderCircle, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { archiveSubscriptionAction, deleteSubscriptionAction } from "./actions";
import { initialSubscriptionActionState } from "./action-state";

export function SubscriptionDangerActions({
  id,
  updatedAt,
}: {
  id: string;
  updatedAt: string;
}) {
  const [showDelete, setShowDelete] = useState(false);
  const [archiveState, archiveAction, archivePending] = useActionState(
    archiveSubscriptionAction,
    initialSubscriptionActionState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    deleteSubscriptionAction,
    initialSubscriptionActionState,
  );

  return (
    <Card className="p-5">
      <h2 className="text-base font-extrabold text-ink">Record controls</h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        These actions change only your SubTrack record. They do not contact or
        cancel the provider.
      </p>

      {archiveState.message || deleteState.message ? (
        <p
          role="alert"
          className="mt-4 rounded-md bg-danger-soft p-3 text-sm text-danger"
        >
          {archiveState.message ?? deleteState.message}
        </p>
      ) : null}

      <div className="mt-5 flex flex-col gap-3">
        <form action={archiveAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
          <Button
            type="submit"
            variant="secondary"
            className="w-full"
            disabled={archivePending}
          >
            {archivePending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <Archive aria-hidden="true" className="size-4" />
            )}
            Archive local record
          </Button>
        </form>

        {showDelete ? (
          <form
            action={deleteAction}
            className="rounded-md border border-danger/40 bg-danger-soft p-3"
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
            <label className="flex items-start gap-3 text-sm leading-6 text-ink">
              <input
                type="checkbox"
                name="confirmation"
                value="delete"
                required
                className="mt-0.5 size-5 accent-[var(--danger)]"
              />
              I understand this deletes only the SubTrack record and does not
              cancel the service.
            </label>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => setShowDelete(false)}
              >
                Keep record
              </Button>
              <Button
                type="submit"
                variant="danger"
                size="small"
                disabled={deletePending}
              >
                {deletePending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <Trash2 aria-hidden="true" className="size-4" />
                )}
                Delete local record
              </Button>
            </div>
          </form>
        ) : (
          <Button
            variant="ghost"
            className="w-full text-danger"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Delete local record
          </Button>
        )}
      </div>
    </Card>
  );
}
