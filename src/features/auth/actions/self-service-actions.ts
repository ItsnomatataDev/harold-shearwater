"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatingOrganizationId } from "@/features/products/products-service";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Not authenticated.");
  return user;
}

/**
 * Guest activation — only for users who chose Customer Access at sign-up.
 */
export async function activateSelfMembership() {
  const user = await requireUser();
  const requestedPortal = user.user_metadata?.portal_access;

  if (requestedPortal !== "customer") {
    throw new Error(
      "Only guest accounts can be activated here. Choose Customer Access when you sign up.",
    );
  }

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("access_memberships")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("access_type", "customer")
    .maybeSingle();

  if (existing) {
    redirect("/auth/continue");
  }

  const { error: insertError } = await admin.from("access_memberships").insert({
    user_id: user.id,
    organization_id: null,
    access_type: "customer",
    status: "active",
    joined_at: new Date().toISOString(),
  });

  if (insertError) throw new Error(insertError.message);

  redirect("/auth/continue");
}

/**
 * Agent access request — creates an invited membership for admin approval.
 */
export async function requestAgentAccess() {
  const user = await requireUser();
  const requestedPortal = user.user_metadata?.portal_access;

  if (requestedPortal !== "agent") {
    throw new Error(
      "Only travel-agent sign-ups can request Agent Access here.",
    );
  }

  const admin = createAdminClient();
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) {
    throw new Error("Shearwater organization is not configured.");
  }

  const { data: existing } = await admin
    .from("access_memberships")
    .select("id, status, access_type")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing?.access_type === "agent" && existing.status === "active") {
    redirect("/auth/continue");
  }

  if (existing?.access_type === "agent") {
    redirect("/access-pending");
  }

  if (existing) {
    throw new Error(
      "This account already has a different access type. Contact Shearwater support to switch to Agent Access.",
    );
  }

  const { error: insertError } = await admin.from("access_memberships").insert({
    user_id: user.id,
    organization_id: organizationId,
    access_type: "agent",
    status: "invited",
  });

  if (insertError) throw new Error(insertError.message);

  redirect("/access-pending");
}
