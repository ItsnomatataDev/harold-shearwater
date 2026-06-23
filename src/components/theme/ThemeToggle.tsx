"use client";

import { Icon } from "@/components/Icon";
import { setTheme, useTheme } from "./theme-store";

export function ThemeToggle() {
  const theme = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";
  const label = `Switch to ${nextTheme} mode`;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(nextTheme)}
      className="theme-toggle grid h-10 w-10 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-secondary)] transition hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="h-4.5 w-4.5" />
    </button>
  );
}
