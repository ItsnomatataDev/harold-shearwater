"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdminContext } from "@/features/auth/services/auth-context";
import { getOperatingOrganizationId } from "@/features/products/products-service";

export async function approveAgentMembership(membershipId: string) {
  await requirePlatformAdminContext();

  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) {
    throw new Error("Shearwater organization is not configured.");
  }

  const admin = createAdminClient();
  const { data: membership, error: lookupError } = await admin
    .from("access_memberships")
    .select("id,access_type,status")
    .eq("id", membershipId)
    .maybeSingle();

  if (lookupError) throw new Error(lookupError.message);
  if (!membership) throw new Error("Membership not found.");
  if (membership.access_type !== "agent") {
    throw new Error("Only agent memberships can be approved here.");
  }
  if (membership.status === "active") {
    return { success: true, alreadyActive: true };
  }

  const { error } = await admin
    .from("access_memberships")
    .update({
      status: "active",
      organization_id: organizationId,
      joined_at: new Date().toISOString(),
    })
    .eq("id", membershipId)
    .eq("access_type", "agent");

  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
  return { success: true, alreadyActive: false };
}
