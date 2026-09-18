"use client";

import { Check, Clock3, RotateCcw, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Decision = "pending" | "approved" | "deferred" | "rejected";

const suggestions = [
  {
    id: "northstar",
    merchant: "Northstar Cinema",
    amount: "$18.99",
    cadence: "Monthly",
    confidence: 96,
    reason: "Three similar charges approximately one month apart.",
    detail:
      "Merchant names matched after removing transaction identifiers; amounts changed once.",
    color: "#176b57",
  },
  {
    id: "cloudnest",
    merchant: "CloudNest Storage",
    amount: "$2.99",
    cadence: "Monthly",
    confidence: 93,
    reason: "Three equal charges one month apart.",
    detail: "Amounts were identical, and billing dates stayed within one day.",
    color: "#397a9a",
  },
  {
    id: "riverside",
    merchant: "Riverside Market",
    amount: "$43.72",
    cadence: "Unknown",
    confidence: 42,
    reason: "Only one charge appeared in this statement.",
    detail: "There is not enough evidence to treat this purchase as recurring.",
    color: "#bd613f",
  },
];

export function StatementReviewDemo() {
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const reviewedCount = Object.values(decisions).filter(
    (decision) => decision !== "pending",
  ).length;

  function setDecision(id: string, decision: Decision) {
    setDecisions((current) => ({ ...current, [id]: decision }));
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-muted" aria-live="polite">
          {reviewedCount} of {suggestions.length} reviewed
        </p>
        {reviewedCount > 0 ? (
          <Button variant="ghost" size="small" onClick={() => setDecisions({})}>
            <RotateCcw aria-hidden="true" className="size-4" />
            Reset example
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4">
        {suggestions.map((suggestion) => {
          const decision = decisions[suggestion.id] ?? "pending";

          return (
            <Card
              key={suggestion.id}
              className={cn(
                "p-5 transition-colors sm:p-6",
                decision === "approved" && "border-brand/50 bg-brand-soft/35",
                decision === "rejected" && "opacity-65",
              )}
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-md text-sm font-extrabold text-white"
                    style={{ backgroundColor: suggestion.color }}
                  >
                    {suggestion.merchant.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold text-ink">
                        {suggestion.merchant}
                      </h3>
                      <Badge
                        tone={
                          suggestion.confidence >= 80 ? "success" : "warning"
                        }
                      >
                        {suggestion.confidence}% confidence
                      </Badge>
                      {decision !== "pending" ? (
                        <Badge
                          tone={
                            decision === "approved"
                              ? "success"
                              : decision === "deferred"
                                ? "warning"
                                : "neutral"
                          }
                        >
                          {decision === "approved"
                            ? "Confirmed"
                            : decision === "deferred"
                              ? "Review later"
                              : "Rejected"}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-bold text-ink">
                      {suggestion.reason}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      {suggestion.detail}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-5 border-t border-line pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-ink">
                      {suggestion.amount}
                    </p>
                    <p className="text-xs text-muted">{suggestion.cadence}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Reject ${suggestion.merchant}`}
                      title="Reject"
                      onClick={() => setDecision(suggestion.id, "rejected")}
                    >
                      <X aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      aria-label={`Review ${suggestion.merchant} later`}
                      title="Review later"
                      onClick={() => setDecision(suggestion.id, "deferred")}
                    >
                      <Clock3 aria-hidden="true" className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      aria-label={`Confirm ${suggestion.merchant}`}
                      title="Confirm"
                      onClick={() => setDecision(suggestion.id, "approved")}
                    >
                      <Check aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
