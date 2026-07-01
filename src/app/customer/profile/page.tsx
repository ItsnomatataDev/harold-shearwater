import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";
import {
  ApiPendingPanel,
  CustomerPageHeader,
  EmptyState,
} from "@/features/customer/components/CustomerPortalCards";
import type { CustomerProfileSummary } from "@/features/customer/components/CustomerPortalCards";

export const metadata = { title: "Profile and Party" };

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#2b2b27] py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-xs uppercase tracking-[.14em] text-[#77776f]">
        {label}
      </dt>
      <dd className="text-sm text-white">{value?.trim() || "Not provided"}</dd>
    </div>
  );
}

export default async function CustomerProfilePage() {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");

  const profile: CustomerProfileSummary = {
    fullName: customer.context.fullName,
    email: customer.context.email,
    phone: customer.context.phone,
    timezone: customer.context.timezone,
  };

  return (
    <div className="space-y-6">
      <HaroldModuleContext moduleId="profile" />
      <CustomerPageHeader
        eyebrow="Profile and Party"
        title="Guest details"
        description="Customer details, preferences and participant information belong here, with consent and provenance tracked before data is used for bookings."
      />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6">
          <h2 className="text-base font-semibold text-white">
            Contact profile
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#9b9b94]">
            This uses the authenticated customer profile for now. Editable
            profile fields can be enabled once consent and validation rules are
            agreed.
          </p>
          <dl className="mt-5">
            <ProfileRow label="Name" value={profile.fullName} />
            <ProfileRow label="Email" value={profile.email} />
            <ProfileRow label="Phone" value={profile.phone} />
            <ProfileRow label="Timezone" value={profile.timezone} />
          </dl>
        </section>

        <section className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6">
          <h2 className="text-base font-semibold text-white">
            Preferences and consent
          </h2>
          <div className="mt-5 space-y-3 text-sm leading-6 text-[#b7b7af]">
            <p className="rounded-2xl bg-[#151513] p-4">
              Collect only what is needed for the experience, guest safety and
              communication.
            </p>
            <p className="rounded-2xl bg-[#151513] p-4">
              Record where each detail came from: customer entry, imported
              booking, agent update or staff-assisted correction.
            </p>
            <p className="rounded-2xl bg-[#151513] p-4">
              Keep sensitive updates out of Harold automation unless a clear
              approval rule exists.
            </p>
          </div>
        </section>
      </div>

      <EmptyState
        icon="users"
        title="No party members added yet"
        description="When booking data is imported, participant details can be linked here for requirements, restrictions, waivers and preparation notes."
      />

      <ApiPendingPanel
        title="Profile data should stay minimal and auditable"
        description="This area is ready for customer profile and party workflows, but direct editing should wait until the required fields, consent rules and booking ownership model are clear."
        points={[
          "Customer owns personal profile details",
          "Party members connect to bookings",
          "Consent and provenance are recorded",
          "Only necessary data is collected",
        ]}
      />
    </div>
  );
}
