import { redirect } from "next/navigation";
import { getAuthContext } from "@/features/auth/services/auth-context";
import { getAvailablePortals } from "@/features/auth/services/auth-routing";
import { SignOutButton } from "@/features/auth/components/SignOutButton";
import { ActivateAccountButton } from "@/features/auth/components/ActivateAccountButton";
import { RequestAgentAccessButton } from "@/features/auth/components/RequestAgentAccessButton";
import { createClient } from "@/lib/supabase/server";

export default async function AccessPendingPage() {
  const context = await getAuthContext();
  if (!context) redirect("/auth");

  const portals = await getAvailablePortals(context);
  if (portals.length > 0) redirect("/select-access");

  const supabase = await createClient();
  const { data: pendingMembership } = await supabase
    .from("access_memberships")
    .select("access_type, status")
    .eq("user_id", context.userId)
    .in("access_type", ["agent", "customer"])
    .maybeSingle();

  const isCustomerSignup = context.intendedPortal === "customer";
  const isAgentSignup = context.intendedPortal === "agent";
  const isTeamSignup = context.intendedPortal === "team";
  const agentRequestSubmitted =
    isAgentSignup && pendingMembership?.access_type === "agent";

  return (
    <main className="grid min-h-screen place-items-center bg-[#111] px-6">
      <section className="w-full max-w-lg rounded-3xl border border-[#343431] bg-[#1d1d1b] p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold/10 text-sm font-bold text-gold">
          {context.initials}
        </div>

        <p className="mt-6 text-xs font-semibold uppercase tracking-[.16em] text-gold">
          {isCustomerSignup ? "One more step" : "Access pending"}
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-white">
          {isCustomerSignup
            ? "Activate your guest account"
            : isAgentSignup
              ? agentRequestSubmitted
                ? "Agent request received"
                : "Request Agent Access"
              : isTeamSignup
                ? "Complete your team invitation"
                : "Choose how you signed up"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#91918b]">
          {isCustomerSignup
            ? "You chose Customer Access. Confirm below to open the guest portal."
            : isAgentSignup
              ? agentRequestSubmitted
                ? "Shearwater will review your travel-agent request and link your agency before Agent Access is enabled."
                : "You chose Agent Access. Submit your request and Shearwater will approve your travel-agency account."
              : isTeamSignup
                ? "Open the invitation link from your email again after signing in, then set your password and accept the invite."
                : "Sign out and create a new account, choosing Guest or Travel Agent. Team members must use an invitation link."}
        </p>

        <div className="mt-6 rounded-2xl border border-[#343431] bg-[#151513] px-4 py-3 text-left text-xs leading-5 text-[#8d8d87]">
          <p className="font-semibold text-[#d0d0c9]">How Shearwater access works</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Team Access is invite-only from Admin → Staff Management</li>
            <li>Guests and travel agents sign up on the login page</li>
            <li>One login works across every workspace you are approved for</li>
          </ul>
        </div>

        <p className="mt-5 text-xs text-[#666660]">
          Signed in as {context.email}
        </p>

        <div className="mt-7 space-y-3">
          {isCustomerSignup && (
            <ActivateAccountButton label="Activate Customer Access" />
          )}
          {isAgentSignup && !agentRequestSubmitted && (
            <RequestAgentAccessButton label="Request Agent Access" />
          )}
          {!isCustomerSignup && !isAgentSignup && (
            <p className="text-xs text-[#8d8d87]">
              Need a different account type? Sign out and register again with the
              correct option.
            </p>
          )}
          <SignOutButton />
        </div>
      </section>
    </main>
  );
}
