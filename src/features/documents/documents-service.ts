import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type Document = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  status: string;
  file_url: string | null;
  file_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  doc_type: string;
  owner_type: "team" | "agent" | "customer";
  owner_id: string | null;
  linked_type: string | null;
  linked_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
  download_url?: string | null;
};

export async function getDocuments(
  organizationId: string,
  ownerType?: "team" | "agent" | "customer",
  ownerId?: string,
): Promise<Document[]> {
  const supabase = await createClient();
  let query = supabase
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (ownerType) query = query.eq("owner_type", ownerType);
  if (ownerId) query = query.eq("owner_id", ownerId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Document[];
}

export async function getAgentDocumentLibrary(
  organizationId: string,
): Promise<Document[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const admin = createAdminClient();
  return Promise.all(
    (data ?? []).map(async (row) => {
      const document = row as Document;
      let downloadUrl: string | null = null;
      if (document.file_url) {
        if (/^https?:\/\//i.test(document.file_url)) {
          downloadUrl = document.file_url;
        } else {
          const signed = await admin.storage
            .from("agent-documents")
            .createSignedUrl(document.file_url, 60 * 15);
          downloadUrl = signed.data?.signedUrl ?? null;
        }
      }
      return {
        ...document,
        file_url: document.file_url ?? null,
        file_name: document.file_name ?? null,
        mime_type: document.mime_type ?? null,
        file_size_bytes: document.file_size_bytes ?? null,
        doc_type: document.doc_type ?? "fact_sheet",
        owner_type: document.owner_type ?? "team",
        owner_id: document.owner_id ?? null,
        linked_type: document.linked_type ?? null,
        linked_id: document.linked_id ?? null,
        uploaded_by: document.uploaded_by ?? null,
        download_url: downloadUrl,
      };
    }),
  );
}

export async function getLinkedDocuments(
  linkedType: "enquiry" | "product" | "meeting" | "review",
  linkedId: string,
): Promise<Document[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("linked_type", linkedType)
    .eq("linked_id", linkedId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Document[];
}
