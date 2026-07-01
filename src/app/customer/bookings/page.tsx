import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";
import {
  ApiPendingPanel,
  CustomerPageHeader,
  EmptyState,
} from "@/features/customer/components/CustomerPortalCards";

export const metadata = { title: "My Bookings" };

export default async function CustomerBookingsPage() {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");

  return (
    <div className="space-y-6">
      <HaroldModuleContext moduleId="bookings" />
      <CustomerPageHeader
        eyebrow="Bookings"
        title="Your trips and confirmations"
        description="Imported Activitar orders and approved direct bookings will appear here with status, dates, guest counts, documents and permitted change requests."
      />

      <EmptyState
        icon="calendar"
        title="No bookings linked to your account yet"
        description="Once the booking import is connected, this page will show only bookings you own or bookings where you have been explicitly added as a traveler."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/customer/explore" className="btn-primary text-sm">
              Explore experiences
            </Link>
            <Link href="/customer/chat" className="btn-ghost text-sm">
              Ask Harold
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Imported orders",
            text: "Match external orders by stable references so the same booking is never duplicated.",
          },
          {
            label: "Preparation",
            text: "Surface pickup times, what to bring, restrictions, documents and guest requirements.",
          },
          {
            label: "Change requests",
            text: "Customers can request help, while high-impact changes stay subject to Shearwater approval.",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#2f2f2b] bg-[#191916] p-5"
          >
            <h2 className="text-sm font-semibold text-white">{item.label}</h2>
            <p className="mt-2 text-sm leading-6 text-[#9b9b94]">
              {item.text}
            </p>
          </div>
        ))}
      </section>

      <ApiPendingPanel
        title="Booking source of truth is still pending"
        description="The UI is ready for booking cards, but it will not create, confirm, cancel or change bookings until Shearwater decides whether this platform or Activitar owns each transaction."
        points={[
          "No duplicate imported orders",
          "No booking edits without approval rules",
          "No payment or confirmation assumptions",
          "Guest access scoped per booking",
        ]}
      />
    </div>
  );
}
