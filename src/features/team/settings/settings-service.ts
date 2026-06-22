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

  if (error) throw error;

  return (data as any[]).map((log: any) => ({
    id: log.id,
    action: log.action,
    entityType: log.entity_type,
    entityId: log.entity_id,
    actorEmail: log.profiles?.email || "Unknown",
    metadata: log.metadata || {},
    createdAt: log.created_at,
  })) as AuditLogEntry[];
}
