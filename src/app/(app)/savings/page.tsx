import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { detectCategoryOverlaps } from "@/features/insights/calculations";
import { SavingsPlanner } from "@/features/savings/savings-planner";
import { toSavingsPlanItems } from "@/features/subscriptions/browser-data";
import { formatMoney } from "@/features/subscriptions/calculations";
import { requireAuthenticatedUser } from "@/server/auth";
import { getProfileForUser } from "@/server/dal/profiles";
import { getSubscriptionsForUser } from "@/server/dal/subscriptions";

export const metadata: Metadata = {
  title: "Savings",
};

export default async function SavingsPage() {
  const user = await requireAuthenticatedUser();
  const [profile, subscriptions] = await Promise.all([
    getProfileForUser(user.id),
    getSubscriptionsForUser(user.id),
  ]);
  const overlaps = detectCategoryOverlaps(
    subscriptions.filter(
      (subscription) => subscription.currency === profile.currency,
    ),
    profile.overlapThreshold,
  );
  const candidateIds = new Set(
    overlaps.flatMap((overlap) => overlap.candidateIds),
  );
  const plans = toSavingsPlanItems(
    subscriptions.filter(
      (subscription) => subscription.currency === profile.currency,
    ),
    candidateIds,
  );
  const identifiedSavingsMinor = plans
    .filter((plan) => plan.selectedByDefault)
    .reduce((total, plan) => total + plan.monthlyAmountMinor, 0);

  return (
    <>
      <PageHeader
        eyebrow={
          profile.monthlySavingsGoalMinor === null
            ? "Monthly target not set"
            : `Monthly target · ${formatMoney(
                profile.monthlySavingsGoalMinor,
                profile.currency,
                profile.locale,
              )}`
        }
        title="Savings planner"
        description="Compare possible savings before you decide whether a subscription still earns its place."
        action={
          <Badge tone={identifiedSavingsMinor ? "success" : "neutral"}>
            {formatMoney(
              identifiedSavingsMinor,
              profile.currency,
              profile.locale,
            )}{" "}
            identified
          </Badge>
        }
      />
      <SavingsPlanner
        subscriptions={plans}
        realizedSavingsMinor={profile.realizedSavingsMinor}
        monthlyGoalMinor={profile.monthlySavingsGoalMinor}
        currency={profile.currency}
        locale={profile.locale}
      />
    </>
  );
}
