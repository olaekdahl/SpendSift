import { Card } from "@/components/ui/card";

export function ApplicationLoading() {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page">
      <div className="mb-8 space-y-3">
        <div className="h-3 w-28 animate-pulse rounded bg-line" />
        <div className="h-10 w-full max-w-md animate-pulse rounded bg-line" />
        <div className="h-5 w-full max-w-2xl animate-pulse rounded bg-line" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="h-36 animate-pulse bg-surface-raised" />
        ))}
      </div>
      <span className="sr-only">Loading your private workspace</span>
    </div>
  );
}
