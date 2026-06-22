import { redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";

export default async function CustomerPortalPage() {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");

  return (
    <main className="grid min-h-screen place-items-center bg-[#111] px-6">
      <section className="w-full max-w-3xl rounded-3xl border border-[#343431] bg-[#1d1d1b] p-8">
        <p className="text-xs font-semibold uppercase tracking-[.16em] text-savannah">
          Customer Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Guest workspace
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#91918b]">
          You are authenticated as a Customer user. This portal is access-gated
          and only visible to active customer memberships.
        </p>
        <p className="mt-6 text-xs text-[#666660]">
          Signed in as {customer.context.email}
        </p>
      </section>
    </main>
  );
}
