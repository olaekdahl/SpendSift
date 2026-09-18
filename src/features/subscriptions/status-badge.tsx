import { Badge } from "@/components/ui/badge";

import { statusLabels } from "./presentation";
import type { SubscriptionStatus } from "./schema";

const statusTones = {
  active: "success",
  trial: "warning",
  paused: "neutral",
  cancelled: "neutral",
  expired: "danger",
  needs_review: "warning",
} as const;

export function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}) {
  return <Badge tone={statusTones[status]}>{statusLabels[status]}</Badge>;
}
