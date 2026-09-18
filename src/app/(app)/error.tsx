"use client";

import { CircleAlert, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ApplicationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="grid min-h-80 place-items-center p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-12 place-items-center rounded-md bg-danger-soft text-danger">
          <CircleAlert aria-hidden="true" className="size-5" />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold text-ink">
          We could not load this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Your information was not changed. Try the request again.
        </p>
        <Button onClick={reset} className="mt-6">
          <RotateCcw aria-hidden="true" className="size-4" />
          Try again
        </Button>
      </div>
    </Card>
  );
}
