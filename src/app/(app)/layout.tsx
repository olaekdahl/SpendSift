import { AppShell } from "@/components/app-shell";

export default function DemoAppLayout({ children }: LayoutProps<"/">) {
  return <AppShell>{children}</AppShell>;
}
