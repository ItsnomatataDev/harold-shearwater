"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../components/Icon";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { SwitchWorkspaceLink } from "@/features/auth/components/SwitchWorkspaceLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { RealtimeNotificationListener } from "@/features/team/notifications/components/RealtimeNotificationListener";
import { NotificationBellLoader } from "@/features/team/notifications/components/NotificationBellLoader";
import { HaroldAssistantProvider } from "@/features/harold/HaroldAssistantProvider";
import { HaroldLauncher } from "@/features/harold/HaroldLauncher";

export interface AgentShellUser {
  id: string;
  name: string;
  agency: string;
  initials: string;
}

const agentNavigation: { label: string; href: string; icon: IconName }[] = [
  { label: "Dashboard", href: "/agent/dashboard", icon: "home" },
  { label: "Enquiries", href: "/agent/enquiries", icon: "route" },
  { label: "Bookings", href: "/agent/bookings", icon: "calendar" },
  { label: "Finance", href: "/agent/finance", icon: "dollar" },
  { label: "Products", href: "/agent/products", icon: "package" },
  { label: "Rates", href: "/agent/rates", icon: "dollar" },
  { label: "Availability", href: "/agent/search", icon: "calendar" },
  { label: "Harold AI", href: "/agent/harold", icon: "harold" },
  { label: "Documents", href: "/agent/inbox", icon: "mail" },
  { label: "Chat", href: "/agent/chat", icon: "communication" },
  { label: "Notifications", href: "/agent/notifications", icon: "bell" },
  { label: "Settings", href: "/agent/settings", icon: "settings" },
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

export function AgentShell({
  children,
  user,
  organizationId,
  showWorkspaceSwitch = false,
}: {
  children: ReactNode;
  user: AgentShellUser;
  organizationId: string;
  showWorkspaceSwitch?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <HaroldAssistantProvider access="agent">
    <div className="app-bg min-h-screen">
      <RealtimeNotificationListener
        userId={user.id}
        organizationId={organizationId}
      />
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
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
          Agent Portal
        </p>

        <nav className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
          {agentNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive(item.href)
                  ? "bg-[#2b2b29] font-semibold text-white shadow-[inset_3px_0_0_#e7b347]"
                  : "text-[#9c9c96] hover:bg-[#212120] hover:text-white"
              }`}
            >
              <Icon
                name={item.icon}
                className={`h-4 w-4 shrink-0 ${
                  isActive(item.href)
                    ? "text-gold"
                    : "text-[#777771] group-hover:text-[#aaa]"
                }`}
              />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User footer card */}
        <div className="mt-3 shrink-0 rounded-2xl border border-[#343431] bg-[#1d1d1b] p-3">
          {showWorkspaceSwitch && (
            <div className="mb-2 border-b border-[#343431] pb-2">
              <SwitchWorkspaceLink compact />
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/15 text-[10px] font-bold text-gold">
              {user.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {user.name}
              </p>
              <p className="truncate text-[10px] text-[#898983]">
                {user.agency}
              </p>
            </div>
            <div className="ml-auto">
              <SignOutButton compact />
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="shell-content lg:pl-64">
        {/* Sticky top header — matches AppShell */}
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
                Agent workspace
              </p>
              <p className="mt-1 text-sm font-medium text-[#d9d9d3]">
                {user.agency}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationBellLoader
              organizationId={organizationId}
              notificationCentrePath="/agent/notifications"
            />
            <div className="ml-2 hidden h-8 w-px bg-[#30302e] sm:block" />
            <div className="ml-1 hidden items-center gap-2 rounded-xl px-2 py-1.5 sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gold/15 text-[10px] font-bold text-gold">
                {user.initials}
              </div>
            </div>
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
