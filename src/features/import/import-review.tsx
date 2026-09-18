"use client";

import {
  Check,
  Clock3,
  FilePenLine,
  FileSpreadsheet,
  GitMerge,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/features/subscriptions/calculations";
import { frequencyLabels } from "@/features/subscriptions/presentation";
import {
  subscriptionCategories,
  type SubscriptionCategory,
} from "@/features/subscriptions/schema";
import type {
  ImportSuggestionDto,
  StatementImportDto,
} from "@/server/dal/imports";

import {
  approveImportSuggestionAction,
  decideImportSuggestionAction,
  discardStatementImportAction,
  editImportSuggestionAction,
  mergeImportSuggestionAction,
} from "./actions";
import {
  initialImportActionState,
  type ImportActionState,
} from "./action-state";

type MergeTarget = { id: string; displayName: string };

const detectedFrequencies = [
  "weekly",
  "monthly",
  "every_two_months",
  "quarterly",
  "every_six_months",
  "annual",
] as const;

const inputClassName =
  "h-10 w-full rounded-md border border-line bg-surface-raised px-3 text-sm text-ink";

const decisionLabels = {
  pending: "Needs review",
  approved: "Approved",
  merged: "Merged",
  rejected: "Rejected",
  deferred: "Review later",
} as const;

function HiddenVersion({
  statementImport,
  suggestion,
}: {
  statementImport: StatementImportDto;
  suggestion: ImportSuggestionDto;
}) {
  return (
    <>
      <input type="hidden" name="importId" value={statementImport.id} />
      <input type="hidden" name="suggestionId" value={suggestion.id} />
      <input
        type="hidden"
        name="expectedUpdatedAt"
        value={suggestion.updatedAt}
      />
    </>
  );
}

function ActionError({ state }: { state: ImportActionState }) {
  const message =
    state.message ?? Object.values(state.fieldErrors ?? {}).flat()[0];
  return message ? (
    <p role="alert" className="mt-3 text-xs font-bold text-danger">
      {message}
    </p>
  ) : null;
}

function SuggestionCard({
  statementImport,
  suggestion,
  mergeTargets,
}: {
  statementImport: StatementImportDto;
  suggestion: ImportSuggestionDto;
  mergeTargets: MergeTarget[];
}) {
  const [editState, editAction, editPending] = useActionState(
    editImportSuggestionAction,
    initialImportActionState,
  );
  const [approveState, approveAction, approvePending] = useActionState(
    approveImportSuggestionAction,
    initialImportActionState,
  );
  const [mergeState, mergeAction, mergePending] = useActionState(
    mergeImportSuggestionAction,
    initialImportActionState,
  );
  const [decisionState, decisionAction, decisionPending] = useActionState(
    decideImportSuggestionAction,
    initialImportActionState,
  );
  const reviewable = ["pending", "deferred"].includes(suggestion.decision);

  return (
    <Card
      role="article"
      aria-label={`${suggestion.displayName} suggestion`}
      className="overflow-hidden"
    >
      <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start">
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-brand-soft text-lg font-extrabold text-brand-strong">
          {suggestion.displayName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-extrabold text-ink">
              {suggestion.displayName}
            </h3>
            <Badge
              tone={suggestion.confidenceScore >= 80 ? "success" : "warning"}
            >
              {suggestion.confidenceScore}% confidence
            </Badge>
            <Badge
              tone={
                suggestion.decision === "approved" ||
                suggestion.decision === "merged"
                  ? "success"
                  : suggestion.decision === "pending" ||
                      suggestion.decision === "deferred"
                    ? "warning"
                    : "neutral"
              }
            >
              {decisionLabels[suggestion.decision]}
            </Badge>
          </div>
          <p className="mt-2 text-sm font-bold text-ink">
            {suggestion.reasonSummary}
          </p>
          <p className="mt-1 text-xs break-words text-muted">
            Normalized merchant: {suggestion.normalizedMerchant}
          </p>
        </div>
        <div className="shrink-0 text-left lg:text-right">
          <p className="text-lg font-extrabold text-ink">
            {formatMoney(suggestion.amountMinor, suggestion.currency)}
          </p>
          <p className="text-xs text-muted">
            {frequencyLabels[suggestion.billingFrequency]}
          </p>
        </div>
      </div>

      {reviewable ? (
        <div className="border-t border-line bg-surface-raised p-5 sm:p-6">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
            <form
              action={approveAction}
              className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
            >
              <HiddenVersion
                statementImport={statementImport}
                suggestion={suggestion}
              />
              <label>
                <span className="mb-2 block text-xs font-bold text-muted">
                  Category
                </span>
                <select
                  name="category"
                  defaultValue="Other"
                  className={inputClassName}
                >
                  {subscriptionCategories.map(
                    (category: SubscriptionCategory) => (
                      <option key={category}>{category}</option>
                    ),
                  )}
                </select>
              </label>
              <Button type="submit" disabled={approvePending}>
                {approvePending ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : (
                  <Check aria-hidden="true" className="size-4" />
                )}
                Approve
              </Button>
              <ActionError state={approveState} />
            </form>

            <div className="flex flex-wrap gap-2">
              <form action={decisionAction}>
                <HiddenVersion
                  statementImport={statementImport}
                  suggestion={suggestion}
                />
                <input type="hidden" name="decision" value="deferred" />
                <Button
                  variant="secondary"
                  type="submit"
                  disabled={decisionPending}
                >
                  <Clock3 aria-hidden="true" className="size-4" />
                  Later
                </Button>
              </form>
              <form action={decisionAction}>
                <HiddenVersion
                  statementImport={statementImport}
                  suggestion={suggestion}
                />
                <input type="hidden" name="decision" value="rejected" />
                <Button
                  variant="ghost"
                  type="submit"
                  disabled={decisionPending}
                >
                  <X aria-hidden="true" className="size-4" />
                  Reject
                </Button>
              </form>
            </div>
          </div>
          <ActionError state={decisionState} />

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <details className="rounded-md border border-line bg-surface p-4">
              <summary className="cursor-pointer text-sm font-extrabold text-ink">
                <FilePenLine
                  aria-hidden="true"
                  className="mr-2 inline size-4"
                />
                Edit suggestion
              </summary>
              <form
                action={editAction}
                className="mt-4 grid gap-3 sm:grid-cols-2"
              >
                <HiddenVersion
                  statementImport={statementImport}
                  suggestion={suggestion}
                />
                <label className="sm:col-span-2">
                  <span className="mb-1 block text-xs font-bold text-muted">
                    Display name
                  </span>
                  <input
                    name="displayName"
                    defaultValue={suggestion.displayName}
                    maxLength={120}
                    className={inputClassName}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-muted">
                    Amount
                  </span>
                  <input
                    name="amountMinor"
                    defaultValue={(suggestion.amountMinor / 100).toFixed(2)}
                    inputMode="decimal"
                    className={inputClassName}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-muted">
                    Frequency
                  </span>
                  <select
                    name="billingFrequency"
                    defaultValue={suggestion.billingFrequency}
                    className={inputClassName}
                  >
                    {detectedFrequencies.map((frequency) => (
                      <option key={frequency} value={frequency}>
                        {frequencyLabels[frequency]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-muted">
                    Start date
                  </span>
                  <input
                    name="startDate"
                    type="date"
                    defaultValue={suggestion.startDate}
                    className={inputClassName}
                  />
                </label>
                <label>
                  <span className="mb-1 block text-xs font-bold text-muted">
                    Next billing date
                  </span>
                  <input
                    name="nextBillingDate"
                    type="date"
                    defaultValue={suggestion.nextBillingDate}
                    className={inputClassName}
                  />
                </label>
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={editPending}
                  className="sm:col-span-2 sm:justify-self-start"
                >
                  {editPending ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <FilePenLine aria-hidden="true" className="size-4" />
                  )}
                  Save changes
                </Button>
                <div className="sm:col-span-2">
                  <ActionError state={editState} />
                </div>
              </form>
            </details>

            <details className="rounded-md border border-line bg-surface p-4">
              <summary className="cursor-pointer text-sm font-extrabold text-ink">
                <GitMerge aria-hidden="true" className="mr-2 inline size-4" />
                Merge with tracked service
              </summary>
              {mergeTargets.length ? (
                <form action={mergeAction} className="mt-4 grid gap-3">
                  <HiddenVersion
                    statementImport={statementImport}
                    suggestion={suggestion}
                  />
                  <label>
                    <span className="mb-1 block text-xs font-bold text-muted">
                      Subscription
                    </span>
                    <select name="subscriptionId" className={inputClassName}>
                      {mergeTargets.map((target) => (
                        <option key={target.id} value={target.id}>
                          {target.displayName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={mergePending}
                    className="justify-self-start"
                  >
                    {mergePending ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="size-4 animate-spin"
                      />
                    ) : (
                      <GitMerge aria-hidden="true" className="size-4" />
                    )}
                    Merge
                  </Button>
                  <ActionError state={mergeState} />
                </form>
              ) : (
                <p className="mt-3 text-sm text-muted">
                  No existing subscription is available to merge.
                </p>
              )}
            </details>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function DiscardImport({
  statementImport,
}: {
  statementImport: StatementImportDto;
}) {
  const [state, action, pending] = useActionState(
    discardStatementImportAction,
    initialImportActionState,
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="importId" value={statementImport.id} />
      <label className="flex items-center gap-2 text-sm font-semibold text-muted">
        <input
          type="checkbox"
          name="confirmation"
          value="discard"
          required
          className="size-4 accent-brand"
        />
        Delete this import and its normalized records
      </label>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <Trash2 aria-hidden="true" className="size-4" />
        )}
        Discard
      </Button>
      <ActionError state={state} />
    </form>
  );
}

export function ImportReview({
  statementImport,
  mergeTargets,
}: {
  statementImport: StatementImportDto;
  mergeTargets: MergeTarget[];
}) {
  const reviewed = statementImport.suggestions.filter(
    (suggestion) => suggestion.decision !== "pending",
  ).length;
  const completed = statementImport.status === "completed";

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 sm:flex-row sm:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-extrabold text-ink">
              {completed ? "Import summary" : "Review suggestions"}
            </h2>
            <Badge tone={completed ? "success" : "warning"}>
              {completed
                ? "Completed"
                : `${reviewed} of ${statementImport.suggestions.length} reviewed`}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            {statementImport.rowCount} normalized transactions ·{" "}
            {statementImport.acceptedCount} retained ·{" "}
            {statementImport.rejectedCount} removed
          </p>
        </div>
        {completed ? (
          <Link
            href="/import"
            className={buttonVariants({ variant: "secondary" })}
          >
            <FileSpreadsheet aria-hidden="true" className="size-4" />
            New import
          </Link>
        ) : null}
      </div>

      {statementImport.suggestions.length ? (
        statementImport.suggestions.map((suggestion) => (
          <SuggestionCard
            key={suggestion.id}
            statementImport={statementImport}
            suggestion={suggestion}
            mergeTargets={mergeTargets}
          />
        ))
      ) : (
        <Card className="p-6">
          <h3 className="font-extrabold text-ink">
            No recurring pattern found
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted">
            The normalized transactions remain available for duplicate checks
            and later statement comparisons.
          </p>
        </Card>
      )}

      {!completed ? (
        <div className="border-t border-line pt-5">
          <DiscardImport statementImport={statementImport} />
        </div>
      ) : null}
    </div>
  );
}
