import Link from "next/link";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" aria-label="SubTrack home">
          <Brand />
        </Link>
        <ThemeToggle />
      </header>
      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center px-5 py-10 sm:px-8">
        {children}
      </main>
    </div>
  );
}
