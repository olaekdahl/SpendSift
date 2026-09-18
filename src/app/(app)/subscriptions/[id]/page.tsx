import type { Metadata } from "next";
import {
  ArrowLeft,
  CalendarDays,
  CircleAlert,
  CreditCard,
  ExternalLink,
  Globe2,
  Pencil,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  formatMoney,
  monthlyEquivalentMinor,
} from "@/features/subscriptions/calculations";
import {
  formatDisplayDate,
  frequencyLabels,
} from "@/features/subscriptions/presentation";
import { safeExternalUrlSchema } from "@/features/subscriptions/schema";
import { SubscriptionDangerActions } from "@/features/subscriptions/subscription-danger-actions";
import { SubscriptionStatusBadge } from "@/features/subscriptions/status-badge";
import { requireAuthenticatedUser } from "@/server/auth";
import { getSubscriptionForUser } from "@/server/dal/subscriptions";

export const metadata: Metadata = {
  title: "Subscription details",
};

export default async function SubscriptionDetailPage({
  params,
}: PageProps<"/subscriptions/[id]">) {
  const { id } = await params;
  const user = await requireAuthenticatedUser();
  const subscription = await getSubscriptionForUser(user.id, id);

  if (!subscription) {
    notFound();
  }

  const parsedWebsite = subscription.website
    ? safeExternalUrlSchema.safeParse(subscription.website)
    : null;
  const website = parsedWebsite?.success
    ? {
        href: parsedWebsite.data,
        hostname: new URL(parsedWebsite.data).hostname,
      }
    : null;
  const parsedCancellationUrl = subscription.cancellationUrl
    ? safeExternalUrlSchema.safeParse(subscription.cancellationUrl)
    : null;
  const cancellationUrl = parsedCancellationUrl?.success
    ? {
        href: parsedCancellationUrl.data,
        hostname: new URL(parsedCancellationUrl.data).hostname,
      }
    : null;

  return (
    <>
      <Link
        href="/subscriptions"
        className="mb-6 inline-flex items-center gap-2 rounded-md text-sm font-bold text-muted hover:text-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        All subscriptions
      </Link>

      <PageHeader
        eyebrow={subscription.category}
        title={subscription.displayName}
        description={`Tracked from ${subscription.source === "manual" ? "manual entry" : "a reviewed statement import"}.`}
        action={
          <div className="flex items-center gap-2">
            <SubscriptionStatusBadge status={subscription.status} />
            <Link
              href={`/subscriptions/${subscription.id}/edit`}
              className={buttonVariants({ variant: "secondary" })}
            >
              <Pencil aria-hidden="true" className="size-4" />
              Edit
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <div className="flex items-center gap-4 border-b border-line p-5 sm:p-6">
            <span
              className="grid size-14 place-items-center rounded-lg text-xl font-extrabold text-white"
              style={{ backgroundColor: subscription.brandColor }}
            >
              {subscription.displayName.charAt(0)}
            </span>
            <div>
              <p className="font-display text-3xl font-semibold text-ink">
                {formatMoney(subscription.amountMinor)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {frequencyLabels[subscription.frequency]} ·{" "}
                {formatMoney(monthlyEquivalentMinor(subscription))} monthly
                equivalent
              </p>
            </div>
          </div>

          <dl className="grid gap-px bg-line sm:grid-cols-2">
            {[
              {
                icon: CalendarDays,
                term: "Next billing date",
                detail: formatDisplayDate(subscription.nextBillingDate),
              },
              {
                icon: CreditCard,
                term: "Payment method",
                detail: subscription.paymentMethodNickname ?? "Not specified",
              },
              {
                icon: ReceiptText,
                term: "Merchant description",
                detail: subscription.merchantName,
              },
              { icon: Globe2, term: "Currency", detail: subscription.currency },
            ].map(({ icon: Icon, term, detail }) => (
              <div key={term} className="bg-surface p-5">
                <dt className="flex items-center gap-2 text-xs font-bold text-muted">
                  <Icon aria-hidden="true" className="size-4" />
                  {term}
                </dt>
                <dd className="mt-2 text-sm font-extrabold text-ink">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-5">
          {subscription.trialEndDate ? (
            <Card className="border-warning/40 bg-warning-soft p-5">
              <Badge tone="warning">Trial ending</Badge>
              <h2 className="mt-3 text-base font-extrabold text-ink">
                Decide before {formatDisplayDate(subscription.trialEndDate)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                This plan renews annually. Confirm any cancellation directly
                with the provider.
              </p>
            </Card>
          ) : null}

          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-info-soft text-info">
                <CircleAlert aria-hidden="true" className="size-4.5" />
              </span>
              <div>
                <h2 className="text-base font-extrabold text-ink">
                  Cancellation check
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Opening a provider page or deleting this record does not
                  cancel the service. Cancellation is complete only when the
                  provider confirms it.
                </p>
                {subscription.cancellationInstructions ? (
                  <p className="mt-3 text-sm leading-6 whitespace-pre-line text-ink">
                    {subscription.cancellationInstructions}
                  </p>
                ) : null}
                {cancellationUrl ? (
                  <a
                    href={cancellationUrl.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "secondary",
                      className: "mt-4",
                    })}
                  >
                    Open {cancellationUrl.hostname} cancellation page
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                ) : website ? (
                  <a
                    href={website.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonVariants({
                      variant: "secondary",
                      className: "mt-4",
                    })}
                  >
                    Open {website.hostname}
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                ) : null}
              </div>
            </div>
          </Card>

          <SubscriptionDangerActions
            id={subscription.id}
            updatedAt={subscription.updatedAt}
          />
        </div>
      </div>
    </>
  );
}
