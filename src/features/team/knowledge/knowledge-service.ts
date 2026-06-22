import "server-only";

import { createClient } from "@/lib/supabase/server";

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

export async function getDocuments(organizationId: string, canManage = false): Promise<Document[]> {
  const supabase = await createClient();
  let query = supabase.from("documents").select("id,title,description,content,category,status,created_by,published_at,created_at,updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false });
  if (!canManage) query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const userIds = Array.from(new Set((data ?? []).map((document) => document.created_by)));
  const profiles = userIds.length ? await supabase.from("profiles").select("id,first_name,last_name,email").in("id", userIds) : { data: [], error: null };
  if (profiles.error) throw new Error(profiles.error.message);
  const authors = new Map((profiles.data ?? []).map((profile) => [profile.id, `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email]));
  return (data ?? []).map((document) => ({ id: document.id, title: document.title, description: document.description, content: document.content, category: document.category, status: document.status as Document["status"], createdBy: document.created_by, createdByName: authors.get(document.created_by) ?? "Shearwater Team", publishedAt: document.published_at, createdAt: document.created_at, updatedAt: document.updated_at }));
}

export async function getDocument(organizationId: string, documentId: string, canManage: boolean) {
  const documents = await getDocuments(organizationId, canManage);
  return documents.find((document) => document.id === documentId) ?? null;
}
