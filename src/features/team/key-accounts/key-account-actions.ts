"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformAdminContext } from "@/features/auth/services/auth-context";
import { getOperatingOrganizationId } from "@/features/products/products-service";

const assignSchema = z.object({
  partnerMembershipId: z.string().uuid(),
  teamMembershipId: z.string().uuid(),
});

export async function assignKeyAccountAssistant(input: unknown) {
  await requirePlatformAdminContext();
  const parsed = assignSchema.parse(input);
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) {
    throw new Error("Shearwater organization is not configured.");
  }

  const admin = createAdminClient();

  const { data: partner, error: partnerError } = await admin
    .from("access_memberships")
    .select("id,access_type,status")
    .eq("id", parsed.partnerMembershipId)
    .in("access_type", ["agent", "customer"])
    .maybeSingle();
  if (partnerError) throw new Error(partnerError.message);
  if (!partner || partner.status !== "active") {
    throw new Error("Partner membership must be an active agent or customer.");
  }

  const { data: teamMember, error: teamError } = await admin
    .from("access_memberships")
    .select("id,access_type,status,organization_id")
    .eq("id", parsed.teamMembershipId)
    .eq("access_type", "team")
    .maybeSingle();
  if (teamError) throw new Error(teamError.message);
  if (
    !teamMember ||
    teamMember.status !== "active" ||
    teamMember.organization_id !== organizationId
  ) {
    throw new Error("Key account assistant must be an active Team Access member.");
  }

  const {
    data: { user },
  } = await admin.auth.getUser();

  const { error } = await (admin as any).from("key_account_assignments").upsert(
    {
      organization_id: organizationId,
      partner_membership_id: parsed.partnerMembershipId,
      team_membership_id: parsed.teamMembershipId,
      assigned_by: user?.id ?? null,
      assigned_at: new Date().toISOString(),
      active: true,
    },
    { onConflict: "organization_id,partner_membership_id" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
  return { success: true };
}
