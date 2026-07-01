import { createClient } from "@/lib/supabase/server";
import { getOperatingOrganizationId } from "@/features/products/products-service";

export type RatePlan = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  plan_type:
    | "public"
    | "agent_default"
    | "agency_specific"
    | "staff"
    | "promotional";
  valid_from: string | null;
  valid_until: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RatePlanItem = {
  id: string;
  rate_plan_id: string;
  product_id: string;
  variant_id: string | null;
  price_per_person: number;
  currency: string;
  notes: string | null;
  // joined fields:
  product_name?: string;
  variant_name?: string | null;
};

export type RatePlanWithItems = RatePlan & { items: RatePlanItem[] };

export type AgencyAssignment = {
  id: string;
  organization_id: string;
  membership_id: string;
  rate_plan_id: string;
  assigned_at: string;
};

export type AgentRateAccount = {
  membershipId: string;
  name: string;
  email: string;
  agencyName: string;
};

export async function getAgentRateAccounts(
  organizationId: string,
  ratePlanId: string,
): Promise<{
  agents: AgentRateAccount[];
  assignments: AgencyAssignment[];
}> {
  const supabase = await createClient();
  const [membersResult, assignmentsResult] = await Promise.all([
    supabase
      .from("access_memberships")
      .select("id,user_id,profiles!fk_access_memberships_user_profiles(first_name,last_name,email,agency_name)")
      .eq("organization_id", organizationId)
      .eq("access_type", "agent")
      .eq("status", "active"),
    supabase
      .from("agency_rate_assignments")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("rate_plan_id", ratePlanId),
  ]);
  if (membersResult.error) throw membersResult.error;
  if (assignmentsResult.error) throw assignmentsResult.error;

  return {
    agents: (membersResult.data ?? []).map((member) => ({
      membershipId: member.id,
      name:
        `${member.profiles?.first_name ?? ""} ${member.profiles?.last_name ?? ""}`.trim() ||
        member.profiles?.email ||
        "Agent",
      email: member.profiles?.email ?? "",
      agencyName: member.profiles?.agency_name ?? "Independent agent",
    })),
    assignments: (assignmentsResult.data ?? []) as AgencyAssignment[],
  };
}

export async function getRatePlans(
  organizationId: string,
): Promise<RatePlan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rate_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as RatePlan[];
}

export async function getRatePlanWithItems(
  organizationId: string,
  planId: string,
): Promise<RatePlanWithItems | null> {
  const supabase = await createClient();
  const [planResult, itemsResult] = await Promise.all([
    supabase
      .from("rate_plans")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", planId)
      .single(),
    supabase
      .from("rate_plan_items")
      .select("*, product:products(name), variant:product_variants(name)")
      .eq("rate_plan_id", planId),
  ]);

  if (planResult.error || !planResult.data) return null;

  const items: RatePlanItem[] = (itemsResult.data ?? []).map(
    (row: Record<string, unknown>) => ({
      id: row.id as string,
      rate_plan_id: row.rate_plan_id as string,
      product_id: row.product_id as string,
      variant_id: row.variant_id as string | null,
      price_per_person: row.price_per_person as number,
      currency: row.currency as string,
      notes: row.notes as string | null,
      product_name: (row.product as { name?: string } | null)?.name,
      variant_name: (row.variant as { name?: string } | null)?.name ?? null,
    }),
  );

  return { ...(planResult.data as RatePlan), items };
}

export async function getAgentRatePlans(
  membershipId: string,
): Promise<RatePlanWithItems[]> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return [];

  const supabase = await createClient();
  const [assignmentsResult, defaultPlansResult] = await Promise.all([
    supabase
      .from("agency_rate_assignments")
      .select("rate_plan_id")
      .eq("organization_id", organizationId)
      .eq("membership_id", membershipId),
    supabase
      .from("rate_plans")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("plan_type", "agent_default")
      .eq("active", true),
  ]);

  if (assignmentsResult.error) throw assignmentsResult.error;
  if (defaultPlansResult.error) throw defaultPlansResult.error;

  const planIds = Array.from(
    new Set([
      ...(assignmentsResult.data ?? []).map((assignment) => assignment.rate_plan_id),
      ...(defaultPlansResult.data ?? []).map((plan) => plan.id),
    ]),
  );
  if (!planIds.length) return [];

  const plans = await Promise.all(
    planIds.map((id) => getRatePlanWithItems(organizationId, id)),
  );
  return plans.filter((plan): plan is RatePlanWithItems => plan !== null);
}

export async function getMembershipRatePlanAssignments(
  organizationId: string,
  membershipId: string,
): Promise<AgencyAssignment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agency_rate_assignments")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("membership_id", membershipId);
  if (error) throw error;
  return (data ?? []) as AgencyAssignment[];
}
