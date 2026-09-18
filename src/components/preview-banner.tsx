import { TriangleAlert } from "lucide-react";

export function PreviewBanner() {
  return (
    <aside
      aria-label="Preview environment warning"
      className="text-warning-ink relative z-40 border-b border-warning/30 bg-warning-soft px-4 py-3"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-center gap-2 text-sm font-bold sm:items-center">
        <TriangleAlert
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 sm:mt-0"
        />
        <p>
          Preview environment. Email verification is temporarily disabled. Do
          not enter real financial information.
        </p>
      </div>
    </aside>
  );
}
