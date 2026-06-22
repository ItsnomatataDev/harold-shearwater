import "server-only";

import { createClient } from "@/lib/supabase/server";

export interface AuditLogEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: string | null;
  actorEmail: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export async function getAuditLogs(organizationId: string, limit: number = 50) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(
      `
      id,
      action,
      entity_type,
      entity_id,
      metadata,
      created_at,
      profiles!actor_user_id(email)
    `,
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  let rawLogs: any[] = (data as any[]) ?? [];

  if (error) {
    const missingRelationship = error.message.includes(
      "Could not find a relationship",
    );

    if (!missingRelationship) throw error;

    const fallbackLogsResult = await supabase
      .from("audit_logs")
      .select(
        `
        id,
        action,
        entity_type,
        entity_id,
        metadata,
        created_at,
        actor_user_id
      `,
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fallbackLogsResult.error) throw fallbackLogsResult.error;
    rawLogs = (fallbackLogsResult.data as any[]) ?? [];
  }

  const actorIds = Array.from(
    new Set(rawLogs.map((log: any) => log.actor_user_id).filter(Boolean)),
  );

  const { data: profiles, error: profilesError } = actorIds.length
    ? await supabase.from("profiles").select("id,email").in("id", actorIds)
    : { data: [], error: null };

  if (profilesError) throw profilesError;

  const profileById = new Map(
    (profiles ?? []).map((profile: any) => [profile.id, profile]),
  );

  return (rawLogs as any[]).map((log: any) => ({
    id: log.id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    actorEmail:
      log.profiles?.email ||
      profileById.get(log.actor_user_id)?.email ||
      "Unknown",
    metadata: log.metadata || {},
    createdAt: log.created_at,
  })) as AuditLogEntry[];
}
