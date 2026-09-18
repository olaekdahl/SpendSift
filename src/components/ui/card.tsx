import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(17,35,27,0.04)]",
        className,
      )}
      {...props}
    />
  );
}
