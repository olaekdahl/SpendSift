import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { Card } from "@/components/ui/card";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";
import { requireAuthenticatedUser } from "@/server/auth";
import { getProfileForUser } from "@/server/dal/profiles";

export const metadata: Metadata = { title: "Set up your account" };

export default async function OnboardingPage() {
  const user = await requireAuthenticatedUser();
  const profile = await getProfileForUser(user.id);

  if (profile.onboardingComplete) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex h-20 max-w-3xl items-center px-5 sm:px-8">
        <Brand />
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-14">
        <div className="mb-8">
          <p className="text-xs font-extrabold text-brand-strong uppercase">
            A few useful defaults
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold text-ink">
            Make SubTrack yours
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted">
            These settings shape estimates and in-app reminders. You can change
            them later.
          </p>
        </div>
        <Card className="p-5 sm:p-7">
          <OnboardingForm />
        </Card>
      </main>
    </div>
  );
}
