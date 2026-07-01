import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import {
  goldenDuskAgentRefreshToken,
  goldenDuskAgentRevokeToken,
  goldenDuskAgentMe,
} from "./agent-auth-client";
import type {
  GoldenDuskAgentAuthResult,
  GoldenDuskAgentConnectionRow,
  GoldenDuskAgentMe,
} from "./agent-auth-types";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const TOKEN_TTL_MS = 50 * 60 * 1000;

export type GoldenDuskConnectionSummary = {
  connected: boolean;
  connectedEmail: string | null;
  agencyName: string | null;
  consultantName: string | null;
  tokenExpiresAt: string | null;
  liveProfile: GoldenDuskAgentMe | null;
};

function computeTokenExpiry() {
  return new Date(Date.now() + TOKEN_TTL_MS).toISOString();
}

export async function getGoldenDuskConnectionSummary(
  membershipId: string,
  options?: { includeLiveProfile?: boolean },
): Promise<GoldenDuskConnectionSummary> {
  const empty: GoldenDuskConnectionSummary = {
    connected: false,
    connectedEmail: null,
    agencyName: null,
    consultantName: null,
    tokenExpiresAt: null,
    liveProfile: null,
  };

  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("golden_dusk_agent_connections")
    .select(
      "connected_email,agency_name,consultant_name,token_expires_at,access_token",
    )
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (error) {
    if (isMissingDatabaseObject(error)) {
      return empty;
    }
    throw new Error(error.message);
  }

  if (!data?.access_token) {
    return empty;
  }

  let liveProfile: GoldenDuskAgentMe | null = null;
  if (options?.includeLiveProfile) {
    liveProfile = await fetchGoldenDuskAgentMe(membershipId).catch(() => null);
  }

  return {
    connected: true,
    connectedEmail: data.connected_email,
    agencyName: liveProfile?.agencyName ?? data.agency_name,
    consultantName: liveProfile?.consultantName ?? data.consultant_name,
    tokenExpiresAt: data.token_expires_at,
    liveProfile,
  };
}

export async function fetchGoldenDuskAgentMe(
  membershipId: string,
): Promise<GoldenDuskAgentMe | null> {
  const session = await getGoldenDuskAccessToken(membershipId);
  if (!session) return null;
  return goldenDuskAgentMe(session.token);
}

export async function syncGoldenDuskConnectionProfile(membershipId: string) {
  const profile = await fetchGoldenDuskAgentMe(membershipId);
  if (!profile) return null;

  const admin = createAdminClient() as any;
  await admin
    .from("golden_dusk_agent_connections")
    .update({
      agency_name: profile.agencyName,
      consultant_name: profile.consultantName,
      golden_dusk_agency_id: profile.agencyId,
      golden_dusk_consultant_id: profile.consultantId,
    })
    .eq("membership_id", membershipId);

  return profile;
}

export async function createGoldenDuskAuthChallenge(
  membershipId: string,
  input: { challengeToken: string; factors: string[] },
) {
  const admin = createAdminClient() as any;
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS).toISOString();

  await admin
    .from("golden_dusk_agent_auth_challenges")
    .delete()
    .eq("membership_id", membershipId);

  const { data, error } = await admin
    .from("golden_dusk_agent_auth_challenges")
    .insert({
      membership_id: membershipId,
      challenge_token: input.challengeToken,
      factors: input.factors,
      expires_at: expiresAt,
    })
    .select("id, factors, expires_at")
    .single();

  if (error) throw new Error(error.message);
  return {
    challengeId: data.id as string,
    factors: (data.factors as string[]) ?? [],
    expiresAt: data.expires_at as string,
  };
}

export async function getGoldenDuskAuthChallenge(
  membershipId: string,
  challengeId: string,
) {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("golden_dusk_agent_auth_challenges")
    .select("id, challenge_token, factors, expires_at")
    .eq("id", challengeId)
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Your sign-in session expired. Please try again.");
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    await admin
      .from("golden_dusk_agent_auth_challenges")
      .delete()
      .eq("id", challengeId);
    throw new Error("Your sign-in session expired. Please try again.");
  }

  return {
    challengeToken: data.challenge_token as string,
    factors: (data.factors as string[]) ?? [],
  };
}

export async function clearGoldenDuskAuthChallenge(
  membershipId: string,
  challengeId?: string,
) {
  const admin = createAdminClient() as any;
  let query = admin
    .from("golden_dusk_agent_auth_challenges")
    .delete()
    .eq("membership_id", membershipId);
  if (challengeId) query = query.eq("id", challengeId);
  await query;
}

export async function saveGoldenDuskAgentConnection(input: {
  membershipId: string;
  organizationId: string;
  auth: GoldenDuskAgentAuthResult;
  refreshToken?: string | null;
}) {
  if (!input.auth.jwtToken) {
    throw new Error("GoldenDusk did not return an access token.");
  }

  const admin = createAdminClient() as any;
  const row = {
    membership_id: input.membershipId,
    organization_id: input.organizationId,
    golden_dusk_account_id: input.auth.accountId,
    golden_dusk_agency_id: input.auth.agencyId,
    golden_dusk_consultant_id: input.auth.consultantId,
    connected_email: input.auth.email ?? "",
    access_token: input.auth.jwtToken,
    refresh_token: input.refreshToken ?? null,
    token_expires_at: computeTokenExpiry(),
    agency_name: input.auth.agencyName,
    consultant_name: input.auth.consultantName,
  };

  const { error } = await admin
    .from("golden_dusk_agent_connections")
    .upsert(row, { onConflict: "membership_id" });
  if (error) throw new Error(error.message);
}

async function loadGoldenDuskConnection(
  membershipId: string,
): Promise<GoldenDuskAgentConnectionRow | null> {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("golden_dusk_agent_connections")
    .select("*")
    .eq("membership_id", membershipId)
    .maybeSingle();

  if (error) {
    if (isMissingDatabaseObject(error)) return null;
    throw new Error(error.message);
  }
  return (data as GoldenDuskAgentConnectionRow | null) ?? null;
}

export async function getGoldenDuskAccessToken(
  membershipId: string,
): Promise<{ token: string; connection: GoldenDuskAgentConnectionRow } | null> {
  const connection = await loadGoldenDuskConnection(membershipId);
  if (!connection?.access_token) return null;

  const expiresSoon =
    new Date(connection.token_expires_at).getTime() <= Date.now() + 5 * 60 * 1000;

  if (!expiresSoon) {
    return { token: connection.access_token, connection };
  }

  if (!connection.refresh_token) {
    return { token: connection.access_token, connection };
  }

  try {
    const refreshed = await goldenDuskAgentRefreshToken(connection.refresh_token);
    if (!refreshed.jwtToken) return null;
    await saveGoldenDuskAgentConnection({
      membershipId,
      organizationId: connection.organization_id,
      auth: refreshed,
      refreshToken: connection.refresh_token,
    });
    const updated = await loadGoldenDuskConnection(membershipId);
    if (!updated?.access_token) return null;
    return { token: updated.access_token, connection: updated };
  } catch {
    return { token: connection.access_token, connection };
  }
}

export async function disconnectGoldenDuskAgent(membershipId: string) {
  const connection = await loadGoldenDuskConnection(membershipId);
  if (connection?.refresh_token) {
    try {
      await goldenDuskAgentRevokeToken(connection.refresh_token);
    } catch {
      // Best-effort remote logout.
    }
  }

  const admin = createAdminClient() as any;
  await admin
    .from("golden_dusk_agent_connections")
    .delete()
    .eq("membership_id", membershipId);
  await admin
    .from("golden_dusk_agent_auth_challenges")
    .delete()
    .eq("membership_id", membershipId);
}
