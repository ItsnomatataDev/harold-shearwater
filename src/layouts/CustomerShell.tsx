"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

const links = [
  { href: "/customer", label: "Home" },
  { href: "/customer/inbox", label: "Documents" },
  { href: "/customer/chat", label: "Chat" },
];

export function CustomerShell({ children, name }: { children: ReactNode; name: string }) {
  const pathname = usePathname();
  return <div className="min-h-screen bg-[#111] text-white"><header className="sticky top-0 z-30 border-b border-[#2d2d2a] bg-[#151514]/95"><div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-4"><Link href="/customer" className="font-semibold">Shearwater <span className="text-savannah">Guest</span></Link><nav className="flex gap-2">{links.map((link) => <Link key={link.href} href={link.href} className={`rounded-lg px-3 py-2 text-xs ${pathname === link.href ? "bg-[#333] text-white" : "text-[#888] hover:text-white"}`}>{link.label}</Link>)}</nav><div className="ml-auto flex items-center gap-3 text-xs text-[#888]"><span className="hidden sm:inline">{name}</span><SignOutButton compact /></div></div></header><main className="mx-auto max-w-6xl px-5 py-8">{children}</main></div>;
}
