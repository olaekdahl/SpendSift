import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { SubscriptionForm } from "@/features/subscriptions/subscription-form";

export const metadata: Metadata = { title: "Add subscription" };

export default function NewSubscriptionPage() {
  const defaultDate = new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        eyebrow="Manual entry"
        title="Add a subscription"
        description="Record the billing details you know now. You can edit them later."
      />
      <Card className="overflow-hidden">
        <SubscriptionForm mode="create" defaultDate={defaultDate} />
      </Card>
    </>
  );
}
