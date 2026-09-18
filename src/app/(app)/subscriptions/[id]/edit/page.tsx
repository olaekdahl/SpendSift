import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { toSubscriptionEditorData } from "@/features/subscriptions/editor-data";
import { SubscriptionForm } from "@/features/subscriptions/subscription-form";
import { requireAuthenticatedUser } from "@/server/auth";
import { getSubscriptionForUser } from "@/server/dal/subscriptions";

export const metadata: Metadata = { title: "Edit subscription" };

export default async function EditSubscriptionPage({
  params,
}: PageProps<"/subscriptions/[id]/edit">) {
  const { id } = await params;
  const user = await requireAuthenticatedUser();
  const subscription = await getSubscriptionForUser(user.id, id);

  if (!subscription) {
    notFound();
  }

  return (
    <>
      <PageHeader
        eyebrow={subscription.category}
        title={`Edit ${subscription.displayName}`}
        description="Changes update only your SubTrack record unless you also contact the provider."
      />
      <Card className="overflow-hidden">
        <SubscriptionForm
          mode="edit"
          subscription={toSubscriptionEditorData(subscription)}
          defaultDate={subscription.startDate}
        />
      </Card>
    </>
  );
}
