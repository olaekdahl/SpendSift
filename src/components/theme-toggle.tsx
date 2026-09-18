"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isDark ? "Use light theme" : "Use dark theme"}
      title={isDark ? "Use light theme" : "Use dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun aria-hidden="true" className="hidden size-5 dark:block" />
      <Moon aria-hidden="true" className="size-5 dark:hidden" />
    </Button>
  );
}
