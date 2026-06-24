import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { getAgentEnquiries } from "@/features/agent/enquiries/enquiries-service";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = { title: "Dashboard — Agent" };

const STATUS_PILL: Record<string, string> = {
  new: "bg-[#2a2a27] text-[#aaa]",
  qualifying: "bg-earth/10 text-earth",
  quote_requested: "bg-victoria/10 text-victoria",
  quoted: "bg-victoria/10 text-victoria",
  reservation_requested: "bg-gold/10 text-gold",
  confirmed: "bg-savannah/10 text-savannah",
  complete: "bg-gold/10 text-gold",
  cancelled: "bg-[#222] text-[#555]",
};

const QUICK_ACTIONS = [
  {
    label: "New Enquiry",
    description: "Start a client request",
    href: "/agent/enquiries",
    icon: "plus" as const,
    accent: "bg-gold/10 text-gold",
  },
  {
    label: "Search Availability",
    description: "Check dates & products",
    href: "/agent/search",
    icon: "search" as const,
    accent: "bg-victoria/10 text-victoria",
  },
  {
    label: "Ask Harold",
    description: "Products, rates & advice",
    href: "/agent/harold",
    icon: "harold" as const,
    accent: "bg-[#3a2a3a] text-[#c084fc]",
  },
  {
    label: "Documents",
    description: "Vouchers & confirmations",
    href: "/agent/documents",
    icon: "file" as const,
    accent: "bg-savannah/10 text-savannah",
  },
  {
    label: "Agency Settings",
    description: "Edit your profile",
    href: "/agent/settings",
    icon: "settings" as const,
    accent: "bg-[#2a2a27] text-[#888]",
  },
];

export default async function AgentDashboardPage() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const orgId = agent.membership.organizationId;
  const enquiries = await getAgentEnquiries(orgId, agent.membership.id);

  const counts = {
    total: enquiries.length,
    new: enquiries.filter((e) => e.status === "new").length,
    quoted: enquiries.filter((e) => e.status === "quoted").length,
    confirmed: enquiries.filter((e) => e.status === "confirmed").length,
    complete: enquiries.filter((e) => e.status === "complete").length,
  };

  const recent = [...enquiries]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const isNew = enquiries.length === 0;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
            Agent Portal
          </p>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
            Welcome back, {agent.context.firstName}
          </h1>
          <p className="mt-1 text-sm text-[#666]">
            {agent.context.agencyName ?? "Your agency"} &middot; Partner workspace
          </p>
        </div>
        <Link
          href="/agent/enquiries"
          className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-black transition hover:opacity-90"
        >
          <Icon name="plus" className="h-3.5 w-3.5" />
          New Enquiry
        </Link>
          </header>
          
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Total",     value: counts.total,     color: "text-white",    dim: "text-[#555]" },
          { label: "New",       value: counts.new,       color: "text-[#ccc]",   dim: "text-[#444]" },
          { label: "Quoted",    value: counts.quoted,    color: "text-victoria", dim: "text-victoria/40" },
          { label: "Confirmed", value: counts.confirmed, color: "text-savannah", dim: "text-savannah/40" },
          { label: "Complete",  value: counts.complete,  color: "text-gold",     dim: "text-gold/40" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href="/agent/enquiries"
            className="group rounded-2xl border border-[#2e2e2b] bg-[#1a1a18] p-5 transition hover:border-[#3a3a37]"
          >
            <p className={`text-[9px] font-bold uppercase tracking-wider ${stat.dim}`}>
              {stat.label}
            </p>
            <p className={`mt-2 text-3xl font-bold tabular-nums ${stat.color}`}>
              {stat.value}
            </p>
          </Link>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Recent enquiries — 2/3 width */}
        <div className="lg:col-span-2 rounded-2xl border border-[#2e2e2b] bg-[#1a1a18]">
          <div className="flex items-center justify-between border-b border-[#2e2e2b] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-white">Enquiries Pipeline</h2>
              <p className="mt-0.5 text-[10px] text-[#555]">Your most recent client requests</p>
            </div>
            <Link href="/agent/enquiries" className="text-xs font-semibold text-gold hover:underline">
              View all
            </Link>
          </div>

          {isNew ? (
            <div className="flex flex-col items-center gap-3 py-14 text-center px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10">
                <Icon name="route" className="h-7 w-7 text-gold" />
              </div>
              <p className="text-sm font-semibold text-white">No enquiries yet</p>
              <p className="max-w-xs text-xs text-[#555]">
                Create your first enquiry to track client requests from initial interest through to confirmed booking.
              </p>
              <Link
                href="/agent/enquiries"
                className="mt-1 rounded-xl bg-gold px-4 py-2 text-xs font-semibold text-black hover:opacity-90"
              >
                Create First Enquiry
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#232320]">
              {recent.map((e) => (
                <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                  {/* Avatar placeholder */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2a2a27] text-[10px] font-bold text-[#777]">
                    {e.contactName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white">{e.contactName}</p>
                    <p className="truncate text-[10px] text-[#555]">
                      {e.productInterest ?? "General enquiry"}
                      {e.partySize > 1 ? ` · ${e.partySize} guests` : " · 1 guest"}
                      {e.requestedDate
                        ? ` · ${new Date(e.requestedDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${STATUS_PILL[e.status] ?? "bg-[#2a2a27] text-[#888]"}`}
                  >
                    {e.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-4">

          {/* Harold spotlight */}
          <div className="rounded-2xl border border-[#3a2a3a] bg-[#1e1520] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3a2a3a]">
                <Icon name="harold" className="h-5 w-5 text-[#c084fc]" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Harold AI</p>
                <p className="text-[10px] text-[#666]">Your product expert</p>
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-[#888]">
              Ask Harold about Shearwater products, check rates, compare options or get help preparing a client quote.
            </p>
            <Link
              href="/agent/harold"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#3a2a3a] bg-[#2a1a2a] py-2.5 text-xs font-semibold text-[#c084fc] transition hover:bg-[#3a2a3a]"
            >
              <Icon name="harold" className="h-3.5 w-3.5" />
              Ask Harold
            </Link>
          </div>

          {/* Quick actions */}
          <div className="rounded-2xl border border-[#2e2e2b] bg-[#1a1a18]">
            <div className="border-b border-[#2e2e2b] px-4 py-3.5">
              <h3 className="text-xs font-semibold text-white">Quick Actions</h3>
            </div>
            <ul className="divide-y divide-[#232320]">
              {QUICK_ACTIONS.map((action) => (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="flex items-center gap-3 px-4 py-3 transition hover:bg-[#1e1e1c]"
                  >
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${action.accent}`}>
                      <Icon name={action.icon} className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white">{action.label}</p>
                      <p className="text-[10px] text-[#555]">{action.description}</p>
                    </div>
                    <Icon name="chevronRight" className="h-3.5 w-3.5 shrink-0 text-[#444]" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
