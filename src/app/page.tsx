import {
  ArrowRight,
  CalendarCheck2,
  Check,
  Eye,
  FileCheck2,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/config/app";
import { cn } from "@/lib/utils";

const previewBars = [
  { label: "Streaming", amount: "$31.98", width: "100%", color: "#27745a" },
  { label: "Music", amount: "$10.99", width: "34%", color: "#397a9a" },
  { label: "News", amount: "$8.00", width: "25%", color: "#bd613f" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Brand />
        <div className="flex items-center gap-2">
          <a
            className="hidden rounded-md px-3 py-2 text-sm font-semibold text-muted hover:text-ink sm:block"
            href="#how-it-works"
          >
            How it works
          </a>
          <ThemeToggle />
          <Link
            href="/auth/sign-in"
            className={buttonVariants({ variant: "secondary", size: "small" })}
          >
            Sign in
          </Link>
        </div>
      </header>

      <main>
        <section className="overflow-hidden border-y border-line bg-surface">
          <div className="mx-auto max-w-7xl px-5 pt-14 pb-10 sm:px-8 sm:pt-20">
            <div className="rise-in max-w-4xl">
              <p className="mb-4 flex items-center gap-2 text-sm font-extrabold text-brand-strong">
                <Sparkles aria-hidden="true" className="size-4" />A calmer view
                of recurring spending
              </p>
              <h1 className="font-display text-6xl leading-[0.92] font-semibold text-ink sm:text-7xl lg:text-8xl">
                {APP_NAME}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-muted sm:text-xl">
                Find the subscriptions hiding in your statements, review every
                suggestion, and see what your monthly commitments really cost.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/auth/sign-up"
                  className={buttonVariants({ className: "h-12 px-5" })}
                >
                  Create your account
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <span className="text-xs leading-5 text-muted">
                  Start with manual entry. Statement imports arrive in Phase 4.
                </span>
              </div>
            </div>

            <div
              className="rise-in rise-in-delay-2 mt-12 overflow-hidden rounded-lg border border-line bg-canvas shadow-[0_24px_70px_rgba(19,38,29,0.13)]"
              aria-label={`${APP_NAME} dashboard preview`}
            >
              <div
                className="flex h-10 items-center gap-1.5 border-b border-line bg-surface px-4"
                aria-hidden="true"
              >
                <span className="size-2.5 rounded-full bg-danger" />
                <span className="size-2.5 rounded-full bg-warning" />
                <span className="size-2.5 rounded-full bg-brand" />
              </div>
              <div className="grid min-h-72 grid-cols-1 md:grid-cols-[190px_1fr]">
                <div className="hidden border-r border-line bg-surface p-5 md:block">
                  <div className="mb-8 flex items-center gap-2 font-extrabold text-ink">
                    <span className="grid size-7 place-items-center rounded bg-brand text-white">
                      <WalletCards aria-hidden="true" className="size-4" />
                    </span>
                    {APP_NAME}
                  </div>
                  {["Overview", "Subscriptions", "Import", "Calendar"].map(
                    (item, index) => (
                      <div
                        key={item}
                        className={cn(
                          "mb-1 rounded px-3 py-2 text-xs font-semibold",
                          index === 0
                            ? "bg-brand-soft text-brand-strong"
                            : "text-muted",
                        )}
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>
                <div className="p-5 sm:p-7">
                  <div className="mb-6 flex items-end justify-between">
                    <div>
                      <p className="text-xs font-bold text-brand-strong">
                        SEPTEMBER OVERVIEW
                      </p>
                      <p className="mt-1 font-display text-3xl font-semibold text-ink">
                        Your recurring costs
                      </p>
                    </div>
                    <span className="hidden rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-brand-strong sm:block">
                      $23.54 under budget
                    </span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["Monthly estimate", "$61.46"],
                      ["Active plans", "6"],
                      ["Potential savings", "$20.99"],
                    ].map(([label, value], index) => (
                      <div
                        key={label}
                        className="rounded-md border border-line bg-surface p-4"
                      >
                        <p className="text-xs text-muted">{label}</p>
                        <p
                          className={cn(
                            "mt-2 text-2xl font-extrabold",
                            index === 2 ? "text-brand-strong" : "text-ink",
                          )}
                        >
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 grid gap-5 sm:grid-cols-[1.3fr_1fr]">
                    <div className="rounded-md border border-line bg-surface p-4">
                      <p className="mb-4 text-sm font-bold text-ink">
                        Spending by category
                      </p>
                      {previewBars.map((bar) => (
                        <div
                          key={bar.label}
                          className="mb-3 grid grid-cols-[72px_1fr_52px] items-center gap-2 text-[11px] text-muted"
                        >
                          <span>{bar.label}</span>
                          <span className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: bar.width,
                                backgroundColor: bar.color,
                              }}
                            />
                          </span>
                          <span className="text-right font-bold text-ink">
                            {bar.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-md border border-line bg-warning-soft p-4">
                      <p className="text-xs font-bold text-warning">
                        NEEDS A LOOK
                      </p>
                      <p className="mt-2 text-sm font-bold text-ink">
                        Northstar Cinema increased by 18.8%
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        Review the new price before your next renewal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24"
        >
          <div className="grid gap-10 border-b border-line pb-16 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
            <div>
              <p className="text-xs font-extrabold text-brand-strong uppercase">
                How it works
              </p>
              <h2 className="mt-3 font-display text-4xl font-semibold text-ink sm:text-5xl">
                You make every decision.
              </h2>
            </div>
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: FileCheck2,
                  title: "Bring a statement",
                  text: "Start with manual entry or a supported statement file.",
                },
                {
                  icon: Eye,
                  title: "Review matches",
                  text: "See confidence and reasons before anything becomes a subscription.",
                },
                {
                  icon: CalendarCheck2,
                  title: "Plan ahead",
                  text: "Track renewals, trials, budgets, and possible savings in one view.",
                },
              ].map(({ icon: Icon, title, text }, index) => (
                <div key={title}>
                  <span className="mb-4 grid size-11 place-items-center rounded-md bg-surface text-brand-strong shadow-sm">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <p className="text-xs font-bold text-muted">0{index + 1}</p>
                  <h3 className="mt-2 text-base font-extrabold text-ink">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ShieldCheck
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-brand-strong"
              />
              <p className="max-w-2xl text-sm leading-6 text-muted">
                {APP_NAME} does not cancel services for you. Detection and
                savings estimates can be incomplete or inaccurate, so review
                them and confirm changes with each provider.
              </p>
            </div>
            <Link
              href="/auth/sign-in"
              className={buttonVariants({ variant: "secondary" })}
            >
              Sign in
              <Check aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
