import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export interface AuditLogEntry { id: number; action: string; entityType: string; entityId: string | null; actorEmail: string; metadata: Json; createdAt: string }

export async function getAuditLogs(organizationId: string, limit = 50): Promise<AuditLogEntry[]> {
  const supabase = await createClient(); const { data, error } = await supabase.from("audit_logs").select("id,action,entity_type,entity_id,metadata,created_at,actor_user_id").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(limit); if (error) throw new Error(error.message);
  const actorIds = Array.from(new Set((data ?? []).map((log) => log.actor_user_id).filter((id): id is string => Boolean(id)))); const profiles = actorIds.length ? await supabase.from("profiles").select("id,email").in("id", actorIds) : { data: [], error: null }; if (profiles.error) throw new Error(profiles.error.message); const emails = new Map((profiles.data ?? []).map((profile) => [profile.id, profile.email]));
  return (data ?? []).map((log) => ({ id: log.id, action: log.action, entityType: log.entity_type, entityId: log.entity_id, actorEmail: log.actor_user_id ? emails.get(log.actor_user_id) ?? "Unknown" : "System", metadata: log.metadata, createdAt: log.created_at }));
}

export async function getMembershipRoleNames(membershipId: string) { const { data, error } = await (await createClient()).from("membership_roles").select("roles(name)").eq("membership_id", membershipId); if (error) throw new Error(error.message); return (data ?? []).map((item) => item.roles?.name).filter((name): name is string => Boolean(name)); }
