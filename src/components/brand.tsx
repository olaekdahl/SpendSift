import { Layers3 } from "lucide-react";

import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-md bg-brand text-white shadow-sm dark:text-[#0f2119]">
        <Layers3 aria-hidden="true" size={19} strokeWidth={2.2} />
      </span>
      <span
        className={cn("text-lg font-extrabold text-ink", compact && "sr-only")}
      >
        {APP_NAME}
      </span>
    </span>
  );
}
