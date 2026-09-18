import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { toSettingsPreferences } from "@/features/settings/browser-data";
import { PreferencesDemo } from "@/features/settings/preferences-demo";
import { requireAuthenticatedUser } from "@/server/auth";
import { getProfileForUser } from "@/server/dal/profiles";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  const user = await requireAuthenticatedUser();
  const profile = await getProfileForUser(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Account preferences"
        title="Settings"
        description="Choose how your workspace displays costs and reminders."
        action={
          <Badge tone="info">
            <ShieldCheck aria-hidden="true" className="mr-1 size-3.5" />
            Saved privately
          </Badge>
        }
      />
      <PreferencesDemo profile={toSettingsPreferences(profile)} />
    </>
  );
}
