import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export interface Document {
  id: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  status: "draft" | "published" | "archived";
  createdBy: string;
  createdByName: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getDocuments(organizationId: string) {
  const supabase = await createClient();

  const { data, error } = await (supabase
    .from("documents" as any)
    .select(
      `
      id,
      title,
      description,
      content,
      category,
      status,
      created_by,
      published_at,
      created_at,
      updated_at,
      profiles!created_by(first_name, last_name)
    `,
    )
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("published_at", { ascending: false }) as any);

  if (error) throw error;

  return (data as any[]).map((d: any) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    content: d.content,
    category: d.category,
    status: d.status,
    createdBy: d.created_by,
    createdByName:
      `${d.profiles?.first_name || ""} ${d.profiles?.last_name || ""}`.trim(),
    publishedAt: d.published_at,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  })) as Document[];
}
