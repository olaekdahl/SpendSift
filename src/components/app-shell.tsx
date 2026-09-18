"use client";

import {
  Bell,
  CalendarDays,
  CreditCard,
  FileUp,
  LayoutDashboard,
  PiggyBank,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

type NavigationItem = {
  label: string;
  mobileLabel?: string;
  href: string;
  icon: LucideIcon;
};

const navigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    mobileLabel: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Subscriptions",
    mobileLabel: "Plans",
    href: "/subscriptions",
    icon: CreditCard,
  },
  { label: "Import", href: "/import", icon: FileUp },
  { label: "Calendar", href: "/calendar", icon: CalendarDays },
  { label: "Savings", href: "/savings", icon: PiggyBank },
  { label: "Settings", href: "/settings", icon: Settings2 },
];

function NavigationLink({
  item,
  mobile = false,
}: {
  item: NavigationItem;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={mobile ? item.label : undefined}
      className={cn(
        mobile
          ? "flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold"
          : "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold",
        active
          ? "bg-brand-soft text-brand-strong"
          : "text-muted hover:bg-surface-raised hover:text-ink",
      )}
    >
      <Icon
        aria-hidden="true"
        className="size-5 shrink-0"
        strokeWidth={active ? 2.4 : 2}
      />
      <span className={mobile ? "truncate" : undefined}>
        {mobile ? (item.mobileLabel ?? item.label) : item.label}
      </span>
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const mobileItems = navigationItems.filter(
    (item) => item.href !== "/settings",
  );

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#main-content"
        className="fixed top-3 left-3 z-50 -translate-y-24 rounded-md bg-ink px-4 py-2 text-sm font-bold text-surface transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-line bg-surface lg:flex lg:flex-col">
        <div className="flex h-20 items-center px-6">
          <Link href="/dashboard" aria-label={`${APP_NAME} dashboard`}>
            <Brand />
          </Link>
        </div>

        <nav
          aria-label="Primary navigation"
          className="flex flex-1 flex-col gap-1 px-3 py-4"
        >
          {navigationItems.map((item) => (
            <NavigationLink key={item.href} item={item} />
          ))}
        </nav>

        <div className="border-t border-line p-4">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <span className="grid size-9 place-items-center rounded-full bg-info-soft text-sm font-extrabold text-info">
              A
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-ink">
                Alex Morgan
              </span>
              <span className="block text-xs text-muted">Demo account</span>
            </span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-surface/95 px-4 backdrop-blur lg:hidden">
          <Link href="/dashboard" aria-label={`${APP_NAME} dashboard`}>
            <Brand />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Link
              href="/settings"
              aria-label="Settings"
              className={buttonVariants({ variant: "ghost", size: "icon" })}
            >
              <Settings2 aria-hidden="true" className="size-5" />
            </Link>
          </div>
        </header>

        <header className="hidden h-16 items-center justify-end gap-2 border-b border-line bg-surface px-8 lg:flex">
          <Badge tone="warning">Fictional demo data</Badge>
          <Link
            href="/calendar"
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label="Reminder center"
            title="Reminder center"
          >
            <Bell aria-hidden="true" className="size-5" />
          </Link>
        </header>

        <main
          id="main-content"
          className="mx-auto min-h-[calc(100vh-4rem)] max-w-[1440px] px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10"
        >
          {children}
        </main>
      </div>

      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-surface/98 pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {mobileItems.map((item) => (
          <NavigationLink key={item.href} item={item} mobile />
        ))}
      </nav>
    </div>
  );
}
