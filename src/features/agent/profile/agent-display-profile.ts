import "server-only";

import { cache } from "react";
import type { AuthContext } from "@/features/auth/services/auth-context";
import {
  fetchGoldenDuskAgentMe,
  getGoldenDuskConnectionSummary,
} from "@/features/integrations/golden-dusk/agent-auth-service";

export type AgentGoldenDuskProfileView = {
  connected: boolean;
  email: string | null;
  fullName: string | null;
  agencyName: string | null;
  consultantName: string | null;
  currencyCode: string | null;
};

export type AgentDisplayIdentity = {
  name: string;
  agency: string;
  initials: string;
  email: string;
  goldenDusk: AgentGoldenDuskProfileView | null;
};

function buildInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AG";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function splitFullName(fullName: string | null | undefined) {
  const trimmed = fullName?.trim();
  if (!trimmed) return { firstName: "", lastName: "" };
  const parts = trimmed.split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

export function splitAgentFullName(fullName: string | null | undefined) {
  return splitFullName(fullName);
}

async function loadGoldenDuskProfileView(
  membershipId: string,
): Promise<AgentGoldenDuskProfileView | null> {
  const admin = (await import("@/lib/supabase/admin")).createAdminClient() as any;
  const { data, error } = await admin
    .from("golden_dusk_agent_connections")
    .select(
      "connected_email,agency_name,consultant_name,agent_full_name,access_token",
    )
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (error || !data?.access_token) return null;

  return {
    connected: true,
    email: data.connected_email ?? null,
    fullName: data.agent_full_name ?? null,
    agencyName: data.agency_name ?? null,
    consultantName: data.consultant_name ?? null,
    currencyCode: null,
  };
}

export const getAgentGoldenDuskProfileView = cache(
  async (membershipId: string): Promise<AgentGoldenDuskProfileView | null> => {
    return loadGoldenDuskProfileView(membershipId);
  },
);

export async function refreshAgentGoldenDuskProfileView(membershipId: string) {
  const live = await fetchGoldenDuskAgentMe(membershipId);
  if (!live) return getAgentGoldenDuskProfileView(membershipId);

  const admin = (await import("@/lib/supabase/admin")).createAdminClient() as any;
  await admin
    .from("golden_dusk_agent_connections")
    .update({
      agent_full_name: live.fullName,
      agency_name: live.agencyName,
      consultant_name: live.consultantName,
    })
    .eq("membership_id", membershipId);

  return {
    connected: true,
    email: live.email,
    fullName: live.fullName,
    agencyName: live.agencyName,
    consultantName: live.consultantName,
    currencyCode: live.currencyCode,
  } satisfies AgentGoldenDuskProfileView;
}

export async function getAgentDisplayIdentity(
  context: AuthContext,
  membershipId: string,
): Promise<AgentDisplayIdentity> {
  const goldenDusk = await getAgentGoldenDuskProfileView(membershipId);
  const name =
    goldenDusk?.fullName?.trim() ||
    context.fullName ||
    goldenDusk?.email?.trim() ||
    context.email;
  const agency =
    goldenDusk?.agencyName?.trim() ||
    context.agencyName?.trim() ||
    "Travel agent";

  return {
    name,
    agency,
    initials: buildInitials(name),
    email: goldenDusk?.email?.trim() || context.email,
    goldenDusk,
  };
}

export function buildAgentSettingsDefaults(
  context: AuthContext,
  goldenDusk: AgentGoldenDuskProfileView | null,
) {
  const fromGoldenDusk = splitFullName(goldenDusk?.fullName);
  return {
    firstName: fromGoldenDusk.firstName || context.firstName,
    lastName: fromGoldenDusk.lastName || context.lastName,
    phone: context.phone,
    agencyName: goldenDusk?.agencyName?.trim() || context.agencyName || "",
    website: context.website ?? "",
  };
}

export async function ensureAgentProfileSeededFromGoldenDusk(
  userId: string,
  membershipId: string,
  context: AuthContext,
) {
  if (context.agencyName?.trim()) return;

  const goldenDusk = await getAgentGoldenDuskProfileView(membershipId);
  if (!goldenDusk?.agencyName?.trim()) return;

  const fromGoldenDusk = splitFullName(goldenDusk.fullName);
  const admin = (await import("@/lib/supabase/admin")).createAdminClient();
  await admin
    .from("profiles")
    .update({
      agency_name: goldenDusk.agencyName,
      first_name: fromGoldenDusk.firstName || context.firstName,
      last_name: fromGoldenDusk.lastName || context.lastName,
    })
    .eq("id", userId);
}

export async function getAgentSettingsPageData(
  context: AuthContext,
  membershipId: string,
) {
  const [goldenDusk, connection] = await Promise.all([
    getAgentGoldenDuskProfileView(membershipId),
    getGoldenDuskConnectionSummary(membershipId),
  ]);

  return {
    goldenDusk,
    connection,
    defaults: buildAgentSettingsDefaults(context, goldenDusk),
    display: await getAgentDisplayIdentity(context, membershipId),
  };
}
