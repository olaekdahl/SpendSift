import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
  const plans = toSavingsPlanItems(subscriptions);
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
      <SavingsPlanner subscriptions={plans} />
    </>
  );
}
