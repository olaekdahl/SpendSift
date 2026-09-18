import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { CancellationGuideForm } from "@/features/cancellation/cancellation-guide-form";
import { requireAuthenticatedUser } from "@/server/auth";
import { getCancellationGuideForUser } from "@/server/dal/cancellation-guides";
import { getSubscriptionForUser } from "@/server/dal/subscriptions";

export const metadata: Metadata = {
  title: "Cancellation guide",
};

export default async function CancellationGuidePage({
  params,
}: PageProps<"/subscriptions/[id]/cancellation">) {
  const { id } = await params;
  const user = await requireAuthenticatedUser();
  const [subscription, guide] = await Promise.all([
    getSubscriptionForUser(user.id, id),
    getCancellationGuideForUser(user.id, id),
  ]);
  if (!subscription) notFound();

  return (
    <>
      <PageHeader
        eyebrow="Private owner-maintained reference"
        title="Cancellation guide"
        description="Keep provider contact details and steps current without implying that SubTrack can cancel the service."
      />
      <CancellationGuideForm
        subscriptionId={subscription.id}
        subscriptionName={subscription.displayName}
        guide={guide}
      />
    </>
  );
}
