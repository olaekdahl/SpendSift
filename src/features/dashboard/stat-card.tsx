import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatTone = "brand" | "info" | "warning" | "neutral";

const toneClasses: Record<StatTone, string> = {
  brand: "bg-brand-soft text-brand-strong",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  neutral: "bg-surface-raised text-muted",
};

export function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: StatTone;
}) {
  return (
    <Card className="min-h-40 p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold text-muted">{label}</p>
        <span
          className={cn(
            "grid size-9 place-items-center rounded-md",
            toneClasses[tone],
          )}
        >
          <Icon aria-hidden="true" className="size-4.5" />
        </span>
      </div>
      <p className="mt-5 text-3xl font-extrabold text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted">{detail}</p>
    </Card>
  );
}
