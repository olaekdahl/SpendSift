import type { Metadata } from "next";
import { FileUp } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { toSubscriptionListItems } from "@/features/subscriptions/browser-data";
import { SubscriptionExplorer } from "@/features/subscriptions/subscription-explorer";
import { demoSubscriptions } from "@/features/subscriptions/demo-data";

export const metadata: Metadata = {
  title: "Subscriptions",
};

export default function SubscriptionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Your recurring services"
        title="Subscriptions"
        description="Review current plans, renewal dates, and monthly equivalents from fictional demo data."
        action={
          <Link href="/import" className={buttonVariants()}>
            <FileUp aria-hidden="true" className="size-4" />
            Import statement
          </Link>
        }
      />
      <SubscriptionExplorer
        subscriptions={toSubscriptionListItems(demoSubscriptions)}
      />
    </>
  );
}
