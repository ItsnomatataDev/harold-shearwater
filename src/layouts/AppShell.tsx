"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "../components/Icon";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

export interface ShellUser {
  name: string;
  role: string;
  initials: string;
  organization: string;
}

const baseNavigation: {
  label: string;
  href: string;
  icon: IconName;
  badge?: string;
}[] = [
  { label: "Basecamp", href: "/team/dashboard", icon: "home" },
  { label: "Attendance", href: "/team/attendance", icon: "insights" },
  { label: "Duties & Schedules", href: "/team/schedules", icon: "calendar" },
  { label: "Meetings", href: "/team/meetings", icon: "users" },
  {
    label: "Communication",
    href: "/team/communication",
    icon: "communication",
  },
  { label: "Knowledge Base", href: "/team/knowledge", icon: "knowledge" },
  { label: "Harold", href: "/team/harold", icon: "harold" },
  { label: "Reports", href: "/team/insights", icon: "insights" },
  { label: "Profile & Settings", href: "/team/settings", icon: "settings" },
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

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: ShellUser;
}) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const [open, setOpen] = useState(false);
  const navigation = baseNavigation;

  const isActive = (href: string) =>
    currentPath === href || currentPath.startsWith(`${href}/`);

  return (
    <div className="app-bg min-h-screen">
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col border-r border-[#292927] bg-[#151514] px-4 py-5 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2">
          <Logo />
          <button
            aria-label="Close menu"
            className="p-1 text-[#999] lg:hidden"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="my-6 h-px bg-[#292927]" />
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-[#6f6f69]">
          Team Access
        </p>
        <nav className="mt-3 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${isActive(item.href) ? "bg-[#2b2b29] font-semibold text-white shadow-[inset_3px_0_0_#E95A41]" : "text-[#9c9c96] hover:bg-[#212120] hover:text-white"}`}
            >
              <Icon
                name={item.icon}
                className={`h-4.5 w-4.5 ${isActive(item.href) ? "text-sunset" : "text-[#777771] group-hover:text-[#aaa]"}`}
              />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-auto rounded-full bg-sunset/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[.09em] text-[#f47a65]">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-[#343431] bg-[#1d1d1b] p-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-earth text-xs font-bold text-white">
              {user.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {user.name}
              </p>
              <p className="mt-0.5 truncate text-[10px] text-[#898983]">
                {user.role}
              </p>
            </div>
            <div className="ml-auto">
              <SignOutButton compact />
            </div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-[#292927] bg-[#111]/90 px-5 backdrop-blur-xl sm:px-8 lg:px-10">
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
                Workspace
              </p>
              <p className="mt-1 text-sm font-medium text-[#d9d9d3]">
                {user.organization}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              aria-label="Search"
              className="rounded-xl p-2.5 text-[#8e8e88] transition hover:bg-[#242422] hover:text-white"
            >
              <Icon name="search" className="h-4.5 w-4.5" />
            </button>
            <button
              aria-label="Notifications"
              className="relative rounded-xl p-2.5 text-[#8e8e88] transition hover:bg-[#242422] hover:text-white"
            >
              <Icon name="bell" className="h-4.5 w-4.5" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-sunset ring-2 ring-[#111]" />
            </button>
            <div className="ml-2 hidden h-8 w-px bg-[#30302e] sm:block" />
            <button className="ml-1 hidden items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-[#242422] sm:flex">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-earth text-[10px] font-bold text-white">
                {user.initials}
              </div>
              <Icon
                name="chevron"
                className="h-3.5 w-3.5 rotate-90 text-[#777]"
              />
            </button>
          </div>
        </header>
        <main className="mx-auto max-w-370 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
