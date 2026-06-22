"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateDocumentSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  content: z.string().min(1),
  category: z.string().min(1),
});

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, any>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function createDocument(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = CreateDocumentSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: doc, error } = await (supabase
    .from("documents" as any)
    .insert({
      organization_id: organizationId,
      title: parsed.title,
      description: parsed.description || null,
      content: parsed.content,
      category: parsed.category,
      status: "draft",
      created_by: user.id,
    })
    .select("id")
    .single() as any);

  if (error) throw error;

  await logAudit(
    supabase,
    organizationId,
    "document.created",
    "documents",
    doc.id,
    {
      title: parsed.title,
      category: parsed.category,
    },
  );

  return { success: true, documentId: doc.id };
}

export async function publishDocument(
  organizationId: string,
  documentId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await (supabase
    .from("documents" as any)
    .update({
      status: "published",
      published_at: new Date().toISOString(),
    })
    .eq("id", documentId)
    .eq("organization_id", organizationId) as any);

  if (error) throw error;

  await logAudit(
    supabase,
    organizationId,
    "document.published",
    "documents",
    documentId,
    {},
  );

  return { success: true };
}

export async function archiveDocument(
  organizationId: string,
  documentId: string,
) {
  const supabase = await createClient();

  const { error } = await (supabase
    .from("documents" as any)
    .update({ status: "archived" })
    .eq("id", documentId)
    .eq("organization_id", organizationId) as any);

  if (error) throw error;

  await logAudit(
    supabase,
    organizationId,
    "document.archived",
    "documents",
    documentId,
    {},
  );

  return { success: true };
}
