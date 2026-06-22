"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";

const schema = z.object({ title: z.string().trim().min(1).max(180), description: z.string().trim().max(500).optional(), content: z.string().trim().min(1).max(100_000), category: z.string().trim().min(1).max(80) });

async function guard(organizationId: string) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) throw new Error("Team Access is required.");
  if (!(await hasOrganizationPermission(organizationId, "documents.manage"))) throw new Error("You do not have permission to manage knowledge documents.");
  return team;
}

async function audit(organizationId: string, userId: string, action: string, id: string) {
  await (await createClient()).from("audit_logs").insert({ organization_id: organizationId, actor_user_id: userId, action, entity_type: "documents", entity_id: id });
}

export async function createDocument(organizationId: string, input: unknown) {
  const parsed = schema.parse(input); const team = await guard(organizationId); const supabase = await createClient();
  const { data, error } = await supabase.from("documents").insert({ organization_id: organizationId, title: parsed.title, description: parsed.description || null, content: parsed.content, category: parsed.category, status: "draft", created_by: team.context.userId }).select("id").single();
  if (error) throw new Error(error.message); await audit(organizationId, team.context.userId, "document.created", data.id); revalidatePath("/team/knowledge"); return { success: true, documentId: data.id };
}

export async function updateDocument(organizationId: string, documentId: string, input: unknown) {
  const parsed = schema.parse(input); await guard(organizationId); const { error } = await (await createClient()).from("documents").update({ title: parsed.title, description: parsed.description || null, content: parsed.content, category: parsed.category }).eq("id", documentId).eq("organization_id", organizationId); if (error) throw new Error(error.message); revalidatePath("/team/knowledge"); revalidatePath(`/team/knowledge/${documentId}`);
}

export async function publishDocument(organizationId: string, documentId: string) {
  const team = await guard(organizationId); const { error } = await (await createClient()).from("documents").update({ status: "published", published_at: new Date().toISOString() }).eq("id", documentId).eq("organization_id", organizationId); if (error) throw new Error(error.message); await audit(organizationId, team.context.userId, "document.published", documentId); revalidatePath("/team/knowledge"); revalidatePath(`/team/knowledge/${documentId}`);
}

export async function archiveDocument(organizationId: string, documentId: string) {
  const team = await guard(organizationId); const { error } = await (await createClient()).from("documents").update({ status: "archived" }).eq("id", documentId).eq("organization_id", organizationId); if (error) throw new Error(error.message); await audit(organizationId, team.context.userId, "document.archived", documentId); revalidatePath("/team/knowledge"); revalidatePath(`/team/knowledge/${documentId}`);
}
