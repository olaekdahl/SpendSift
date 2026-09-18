import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { SavingsPlanner } from "@/features/savings/savings-planner";
import { toSavingsPlanItems } from "@/features/subscriptions/browser-data";
import { demoSubscriptions } from "@/features/subscriptions/demo-data";

export const metadata: Metadata = {
  title: "Savings",
};

export default function SavingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Monthly target · $25.00"
        title="Savings planner"
        description="Compare possible savings before you decide whether a subscription still earns its place."
        action={<Badge tone="success">$20.99 identified</Badge>}
      />
      <SavingsPlanner subscriptions={toSavingsPlanItems(demoSubscriptions)} />
    </>
  );
}
