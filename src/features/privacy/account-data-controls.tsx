"use client";

import { Download, LoaderCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const inputClassName =
  "h-11 w-full rounded-md border border-line bg-surface-raised px-3 text-sm text-ink";

export function AccountDataControls() {
  const router = useRouter();
  const [exportPassword, setExportPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [exportPending, setExportPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function exportData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setExportPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: exportPassword }),
      });
      if (!response.ok) {
        setMessage(
          response.status === 401
            ? "The password is incorrect."
            : "We could not prepare your export. Try again.",
        );
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "subtrack-export.json";
      link.click();
      URL.revokeObjectURL(url);
      setExportPassword("");
      setMessage("Your export is ready.");
    } catch {
      setMessage("We could not prepare your export. Try again.");
    } finally {
      setExportPending(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeletePending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword, confirmation }),
      });
      if (!response.ok) {
        setMessage(
          response.status === 401
            ? "The password is incorrect."
            : "We could not delete your account. Check the confirmation and try again.",
        );
        return;
      }
      setDeletePassword("");
      setConfirmation("");
      router.replace("/");
      router.refresh();
    } catch {
      setMessage("We could not delete your account. Try again.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <Card className="mt-5 overflow-hidden">
      <div className="border-b border-line px-5 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-lg font-extrabold text-ink">Your data</h2>
          <Link
            href="/privacy"
            className={buttonVariants({ variant: "ghost", size: "small" })}
          >
            Privacy details
          </Link>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted">
          Export your account as JSON or permanently delete the account and all
          owner records. Both actions require your current password.
        </p>
      </div>
      <div className="grid gap-px bg-line lg:grid-cols-2">
        <form onSubmit={exportData} className="bg-surface p-5 sm:p-6">
          <h3 className="font-extrabold text-ink">Download data</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            The export includes normalized records and account preferences, but
            never source statement bytes or authentication tokens.
          </p>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Current password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={exportPassword}
              onChange={(event) => setExportPassword(event.target.value)}
              required
              maxLength={128}
              className={inputClassName}
            />
          </label>
          <Button
            type="submit"
            variant="secondary"
            className="mt-4"
            disabled={exportPending}
          >
            {exportPending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <Download aria-hidden="true" className="size-4" />
            )}
            Download JSON
          </Button>
        </form>

        <form onSubmit={deleteAccount} className="bg-surface p-5 sm:p-6">
          <h3 className="font-extrabold text-danger">Delete account</h3>
          <p className="mt-1 text-sm leading-6 text-muted">
            This permanently deletes your login and all SubTrack records.
            Provider subscriptions are not cancelled.
          </p>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Current password
            </span>
            <input
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              required
              maxLength={128}
              className={inputClassName}
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-2 block text-sm font-bold text-ink">
              Type DELETE MY ACCOUNT
            </span>
            <input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
              autoComplete="off"
              className={inputClassName}
            />
          </label>
          <Button
            type="submit"
            variant="danger"
            className="mt-4"
            disabled={deletePending || confirmation !== "DELETE MY ACCOUNT"}
          >
            {deletePending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <Trash2 aria-hidden="true" className="size-4" />
            )}
            Delete account
          </Button>
        </form>
      </div>
      {message ? (
        <p
          role="status"
          className="border-t border-line px-5 py-4 text-sm font-bold text-muted sm:px-6"
        >
          {message}
        </p>
      ) : null}
    </Card>
  );
}
