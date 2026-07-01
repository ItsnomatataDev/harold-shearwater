import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type KeyAccountAssignment = {
  id: string;
  organizationId: string;
  partnerMembershipId: string;
  partnerName: string;
  partnerEmail: string;
  partnerAccessType: "agent" | "customer";
  teamMembershipId: string;
  assistantName: string;
  assistantEmail: string;
  assignedAt: string;
};

export async function getKeyAccountForPartner(
  organizationId: string,
  partnerMembershipId: string,
): Promise<KeyAccountAssignment | null> {
  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from("key_account_assignments")
    .select("id,organization_id,partner_membership_id,team_membership_id,assigned_at,active")
    .eq("organization_id", organizationId)
    .eq("partner_membership_id", partnerMembershipId)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return hydrateAssignment(data);
}

async function hydrateAssignment(row: {
  id: string;
  organization_id: string;
  partner_membership_id: string;
  team_membership_id: string;
  assigned_at: string;
}): Promise<KeyAccountAssignment | null> {
  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("access_memberships")
    .select("id,access_type,user_id")
    .in("id", [row.partner_membership_id, row.team_membership_id]);
  if (error || !memberships?.length) return null;

  const partner = memberships.find((m) => m.id === row.partner_membership_id);
  const assistant = memberships.find((m) => m.id === row.team_membership_id);
  if (!partner || !assistant) return null;

  const userIds = [partner.user_id, assistant.user_id];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id,first_name,last_name,email")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const partnerProfile = profileMap.get(partner.user_id);
  const assistantProfile = profileMap.get(assistant.user_id);
  const name = (p: typeof partnerProfile) =>
    `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || p?.email || "User";

  return {
    id: row.id,
    organizationId: row.organization_id,
    partnerMembershipId: row.partner_membership_id,
    partnerName: name(partnerProfile),
    partnerEmail: partnerProfile?.email ?? "",
    partnerAccessType: partner.access_type as "agent" | "customer",
    teamMembershipId: row.team_membership_id,
    assistantName: name(assistantProfile),
    assistantEmail: assistantProfile?.email ?? "",
    assignedAt: row.assigned_at,
  };
}

export async function listTeamMembersForKeyAccount(organizationId: string) {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("access_memberships")
    .select("id,user_id")
    .eq("organization_id", organizationId)
    .eq("access_type", "team")
    .eq("status", "active");
  if (error) throw new Error(error.message);

  const userIds = (memberships ?? []).map((m) => m.user_id);
  if (!userIds.length) return [];

  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,email")
    .in("id", userIds);
  if (profileError) throw new Error(profileError.message);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (memberships ?? []).map((membership) => {
    const profile = profileMap.get(membership.user_id);
    const name =
      `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
      profile?.email ||
      "Team member";
    return {
      membershipId: membership.id,
      name,
      email: profile?.email ?? "",
    };
  });
}
