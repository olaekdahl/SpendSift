import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { PreferencesDemo } from "@/features/settings/preferences-demo";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Demo profile"
        title="Settings"
        description="Choose how the fictional workspace displays costs and reminders."
        action={
          <Badge tone="info">
            <ShieldCheck aria-hidden="true" className="mr-1 size-3.5" />
            Local demo only
          </Badge>
        }
      />
      <PreferencesDemo />
    </>
  );
}
