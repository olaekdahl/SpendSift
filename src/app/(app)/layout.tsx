import { AppShell } from "@/components/app-shell";
import { requireAuthenticatedUser } from "@/server/auth";
import { getProfileForUser } from "@/server/dal/profiles";
import { redirect } from "next/navigation";

export default async function ApplicationLayout({
  children,
}: LayoutProps<"/">) {
  const user = await requireAuthenticatedUser();
  const profile = await getProfileForUser(user.id);

  if (!profile.onboardingComplete) {
    redirect("/onboarding");
  }

  return <AppShell accountEmail={user.email}>{children}</AppShell>;
}
