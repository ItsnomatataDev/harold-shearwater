import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";
import {
  ApiPendingPanel,
  CustomerActionCard,
  CustomerPageHeader,
  CustomerStatusCard,
  EmptyState,
} from "@/features/customer/components/CustomerPortalCards";

export default async function CustomerPortalPage() {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");

  return (
    <div className="space-y-6">
      <HaroldModuleContext
        moduleId="customer_home"
        summary={`Guest home for ${customer.context.fullName}`}
      />
      <CustomerPageHeader
        eyebrow="Customer Access"
        title={`Welcome, ${customer.context.fullName}`}
        description="Your guest portal is where bookings, documents, preparation details and Harold support will come together without exposing internal Shearwater operations."
        action={
          <Link
            href="/customer/chat"
            className="inline-flex items-center justify-center rounded-full bg-savannah px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Ask Harold
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <CustomerStatusCard
          icon="calendar"
          label="Bookings"
          value="API pending"
          detail="Imported orders and direct bookings will appear here once the booking source is connected."
        />
        <CustomerStatusCard
          icon="document"
          label="Documents"
          value="Ready"
          detail="Confirmations, vouchers, itineraries and preparation files use the existing document inbox."
        />
        <CustomerStatusCard
          icon="shield"
          label="Access"
          value="Private"
          detail="Guests only see their own profile, party, bookings, documents and conversations."
        />
      </div>

      <EmptyState
        icon="calendar"
        title="No upcoming bookings yet"
        description="When Activitar orders or approved direct bookings are connected, the next confirmed or provisional trip will be highlighted here."
        action={
          <Link href="/customer/bookings" className="btn-ghost text-sm">
            View booking area
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CustomerActionCard
          href="/customer/explore"
          icon="search"
          title="Explore experiences"
          description="Browse the customer-facing discovery area while availability and pricing APIs are being finalized."
          cta="Browse"
        />
        <CustomerActionCard
          href="/customer/profile"
          icon="users"
          title="Profile and party"
          description="Prepare the customer profile, preferences and participant details needed before travel."
          cta="Review"
        />
        <CustomerActionCard
          href="/customer/messages"
          icon="communication"
          title="Messages"
          description="Human chat with Shearwater after Harold hands your conversation to a team member."
          cta="Open"
        />
        <CustomerActionCard
          href="/customer/chat"
          icon="harold"
          title="Harold support"
          description="Ask Harold through the n8n AI workflow. Human help continues in Messages after handover."
          cta="Ask Harold"
        />
      </div>

      <ApiPendingPanel
        title="Customer portal is ready for booking and availability APIs"
        description="This screen is intentionally structured around the SW AI customer journey, but it will not confirm inventory, pricing or payment until the authoritative endpoints are connected."
        points={[
          "Live availability plugs into Explore",
          "Imported orders appear in Bookings",
          "Documents remain scoped to this guest",
          "Harold escalates uncertain requests",
        ]}
      />
    </div>
  );
}
