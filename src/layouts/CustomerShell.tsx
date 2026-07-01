"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { SwitchWorkspaceLink } from "@/features/auth/components/SwitchWorkspaceLink";
import { HaroldAssistantProvider } from "@/features/harold/HaroldAssistantProvider";
import { HaroldLauncher } from "@/features/harold/HaroldLauncher";

const navigation: { label: string; href: string; icon: IconName }[] = [
  { label: "Home", href: "/customer", icon: "home" },
  { label: "Bookings", href: "/customer/bookings", icon: "calendar" },
  { label: "Explore", href: "/customer/explore", icon: "search" },
  { label: "Documents", href: "/customer/inbox", icon: "document" },
  { label: "Profile & Party", href: "/customer/profile", icon: "users" },
  { label: "Harold AI", href: "/customer/chat", icon: "harold" },
  { label: "Messages", href: "/customer/messages", icon: "communication" },
];

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-20 w-20 items-center justify-center overflow-hidden">
        <Image
          src="/swicon.png"
          alt="Shearwater"
          width={80}
          height={80}
          className="h-20 w-20 object-contain object-center"
          priority
        />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-[.12em] text-white">
          Shearwater
        </p>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.16em] text-[#8b8b84]">
          Victoria Falls
        </p>
      </div>
    </div>
  );
}

export function CustomerShell({
  children,
  name,
  initials,
  email,
  showWorkspaceSwitch = false,
}: {
  children: ReactNode;
  name: string;
  initials?: string;
  email?: string;
  showWorkspaceSwitch?: boolean;
}) {
  const pathname = usePathname() ?? "/customer";
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/customer"
      ? pathname === "/customer"
      : pathname === href || pathname.startsWith(`${href}/`);

  const safeInitials =
    initials?.trim() ||
    name
      .split(" ")
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join("")
      .toUpperCase() ||
    "G";

  return (
    <HaroldAssistantProvider access="customer">
    <div className="app-bg min-h-screen">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        data-shell-sidebar
        className={`fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col overflow-hidden border-r border-[#292927] bg-[#151514] px-4 py-5 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex shrink-0 items-center justify-between px-2">
          <Logo />
          <button
            aria-label="Close menu"
            className="p-1 text-[#999] lg:hidden"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="my-6 h-px shrink-0 bg-[#292927]" />
        <p className="shrink-0 px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#6f6f69]">
          Customer Access
        </p>
        <nav className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive(item.href) ? "bg-[#2b2b29] font-semibold text-white shadow-[inset_3px_0_0_var(--color-savannah)]" : "text-[#9c9c96] hover:bg-[#212120] hover:text-white"}`}
            >
              <Icon
                name={item.icon}
                className={`h-4.5 w-4.5 ${isActive(item.href) ? "text-savannah" : "text-[#777771] group-hover:text-[#aaa]"}`}
              />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="mt-3 shrink-0 rounded-2xl border border-[#343431] bg-[#1d1d1b] p-3">
          {showWorkspaceSwitch && (
            <div className="mb-2 border-b border-[#343431] pb-2">
              <SwitchWorkspaceLink compact />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-earth text-xs font-bold text-white">
              {safeInitials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{name}</p>
              <p className="mt-0.5 truncate text-[10px] text-[#898983]">
                {email ?? "Guest"}
              </p>
            </div>
            <div className="ml-auto">
              <SignOutButton compact />
            </div>
          </div>
        </div>
      </aside>
      <div className="shell-content lg:pl-64">
        <header className="shell-header sticky top-0 z-30 flex h-18 items-center justify-between border-b border-[#292927] bg-[#111]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              className="rounded-lg p-2 text-[#aaa] hover:bg-white/5 lg:hidden"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#777771]">
                Guest Portal
              </p>
              <p className="mt-1 text-sm font-medium text-[#d9d9d3]">
                Shearwater Victoria Falls
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/customer/chat"
              className="ml-1 hidden items-center gap-2 rounded-xl bg-savannah px-3 py-2 text-xs font-semibold text-black transition hover:opacity-90 sm:flex"
            >
              <Icon name="harold" className="h-3.5 w-3.5" />
              Ask Harold
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-370 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
      <HaroldLauncher />
    </div>
    </HaroldAssistantProvider>
  );
}
