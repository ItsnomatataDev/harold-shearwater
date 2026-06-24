"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Self-service membership activation.
 * Called when an authenticated user has no membership but their metadata
 * indicates they intended to sign up as a customer. Team and Agent accounts
 * are approval based and cannot activate themselves.
 * Uses the admin client so no RLS issues, but verifies the user's own metadata.
 */
export async function activateSelfMembership() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated.");

  const requestedPortal = user.user_metadata?.portal_access;
  const portalAccess: "team" | "agent" | "customer" =
    requestedPortal === "team" || requestedPortal === "agent"
      ? requestedPortal
      : "customer";

  if (portalAccess === "team" || portalAccess === "agent") {
    throw new Error(
      portalAccess === "agent"
        ? "Agent accounts require approval from Shearwater."
        : "Team accounts require an administrator invitation.",
    );
  }

  const admin = createAdminClient();

  // Check if a membership already exists (avoid duplicates).
  const { data: existing } = await admin
    .from("access_memberships")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("access_type", portalAccess)
    .maybeSingle();

  if (existing) {
    // Membership exists but was somehow not resolved — just redirect.
    redirect("/customer");
  }

  // Create the membership.
  const { error: insertError } = await admin.from("access_memberships").insert({
    user_id: user.id,
    organization_id: null,
    access_type: "customer",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (insertError) throw new Error(insertError.message);

  redirect("/customer");
}
