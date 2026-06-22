"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/Icon";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

export interface AdminShellUser {
  name: string;
  role: string;
  initials: string;
  organization: string;
}

const adminNavigation: Array<{
  label: string;
  href: string;
  icon: IconName;
}> = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "insights" },
  { label: "Attendance Register", href: "/admin/attendance", icon: "clock" },
  { label: "Staff Management", href: "/admin/staff", icon: "crew" },
  { label: "Roles & Permissions", href: "/admin/roles", icon: "shield" },
  { label: "Audit Logs", href: "/admin/audit-logs", icon: "file" },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];

function AdminLogo() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-[#171716]">
        <Image
          src="/swicon.png"
          alt="Shearwater"
          width={56}
          height={56}
          className="h-14 w-14 object-contain object-center"
          priority
        />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-bold uppercase tracking-[.12em] text-white">
          Shearwater
        </p>
        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[.16em] text-[#8b8b84]">
          Admin Portal
        </p>
      </div>
    </div>
  );
}

export function AdminShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AdminShellUser;
}) {
  const pathname = usePathname();
  const currentPath = pathname ?? "";
  const [open, setOpen] = useState(false);

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
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-[#292927] bg-[#151514] px-4 py-5 transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-2">
          <AdminLogo />
          <button
            aria-label="Close menu"
            className="p-1 text-[#999] lg:hidden"
            onClick={() => setOpen(false)}
          >
            <Icon name="close" className="h-5 w-5" />
          </button>
        </div>
        <div className="my-6 h-px bg-[#292927]" />
        <p className="px-3 text-[10px] font-semibold uppercase tracking-[.18em] text-gold">
          Platform Control
        </p>
        <nav className="mt-3 space-y-1">
          {adminNavigation.map((item) => (
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

      <div className="lg:pl-[280px]">
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
                Admin Workspace
              </p>
              <p className="mt-1 text-sm font-medium text-[#d9d9d3]">
                {user.organization}
              </p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-370 px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
