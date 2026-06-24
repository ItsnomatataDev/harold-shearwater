import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/services/auth-context";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { ActivateAccountButton } from "@/features/auth/components/ActivateAccountButton";

export default async function AccessPendingPage() {
  const context = await getAuthContext();
  if (!context) redirect("/auth");

  const noMembership = context.memberships.length === 0;
  const isSelfService =
    noMembership && context.intendedPortal === "customer";

  return (
    <main className="grid min-h-screen place-items-center bg-[#111] px-6">
      <section className="w-full max-w-lg rounded-3xl border border-[#343431] bg-[#1d1d1b] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-gold font-semibold">
          {context.initials}
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-gold">
          {isSelfService ? "Almost there" : "Access pending"}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          {isSelfService
            ? "Activate your account"
            : "Your identity is verified."}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#91918b]">
          {isSelfService
            ? "Your identity is confirmed. Click below to activate your customer account."
            : context.intendedPortal === "agent"
              ? "Your agent account is awaiting Shearwater approval. You will be able to enter the Agent Portal once your membership is activated."
            : context.memberships.length
              ? "Your membership exists, but the portal could not be resolved for this session."
              : "Your account does not have an active Team, Agent or Customer membership. Ask a Shearwater administrator to assign access."}
        </p>

        <p className="mt-5 text-xs text-[#666660]">
          Signed in as {context.email}
        </p>

        <div className="mt-7 space-y-3">
          {isSelfService && (
            <ActivateAccountButton
              label="Activate Customer Account"
            />
          )}
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
