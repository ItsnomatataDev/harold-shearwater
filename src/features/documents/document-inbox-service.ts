import "server-only";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type DocumentInboxItem = {
  deliveryId: string;
  title: string;
  description: string | null;
  documentType: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
  downloadUrl: string | null;
  senderName: string;
  recipientName?: string;
  recipientAccess?: "team" | "agent" | "customer";
  readAt: string | null;
  deliveredAt: string;
};

export type DocumentRecipient = {
  userId: string;
  membershipId: string;
  accessType: "team" | "agent" | "customer";
  name: string;
  email: string;
};

async function signedUrl(path: string | null) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = await createAdminClient().storage
    .from("document-inbox")
    .createSignedUrl(path, 60 * 15);
  return data?.signedUrl ?? null;
}

export async function getDocumentInbox(userId: string) {
  const supabase = await createClient();
  const { data: deliveries, error } = await supabase
    .from("document_deliveries")
    .select("id,document_id,delivered_by,read_at,delivered_at")
    .eq("recipient_user_id", userId)
    .order("delivered_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!deliveries?.length) return [];

  const documentIds = deliveries.map((item) => item.document_id);
  const senderIds = deliveries.flatMap((item) => item.delivered_by ? [item.delivered_by] : []);
  const [{ data: documents, error: documentError }, { data: senders }] = await Promise.all([
    supabase.from("documents").select("id,title,description,doc_type,file_url,file_name,mime_type,file_size_bytes").in("id", documentIds),
    senderIds.length
      ? createAdminClient().from("access_memberships").select("id,user_id").in("id", senderIds)
      : Promise.resolve({ data: [] }),
  ]);
  if (documentError) throw new Error(documentError.message);
  const senderUserIds = (senders ?? []).map((item) => item.user_id);
  const { data: profiles } = senderUserIds.length
    ? await createAdminClient().from("profiles").select("id,first_name,last_name,email").in("id", senderUserIds)
    : { data: [] };
  const names = new Map((profiles ?? []).map((profile) => [profile.id, `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() || profile.email]));
  const senderUsers = new Map((senders ?? []).map((sender) => [sender.id, sender.user_id]));
  const docs = new Map((documents ?? []).map((document) => [document.id, document]));

  return Promise.all(deliveries.flatMap((delivery) => {
    const document = docs.get(delivery.document_id);
    if (!document?.file_name) return [];
    return [signedUrl(document.file_url).then((downloadUrl): DocumentInboxItem => ({
      deliveryId: delivery.id,
      title: document.title,
      description: document.description,
      documentType: document.doc_type,
      fileName: document.file_name!,
      mimeType: document.mime_type,
      fileSizeBytes: document.file_size_bytes,
      downloadUrl,
      senderName: names.get(senderUsers.get(delivery.delivered_by ?? "") ?? "") ?? "Shearwater Team",
      readAt: delivery.read_at,
      deliveredAt: delivery.delivered_at,
    }))];
  }));
}

export async function getDocumentRecipients(organizationId: string): Promise<DocumentRecipient[]> {
  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("access_memberships")
    .select("id,user_id,access_type,organization_id")
    .eq("status", "active")
    .or(`organization_id.eq.${organizationId},access_type.eq.customer`)
    .limit(500);
  if (error) throw new Error(error.message);
  const userIds = Array.from(new Set((memberships ?? []).map((item) => item.user_id)));
  const { data: profiles, error: profileError } = userIds.length
    ? await admin.from("profiles").select("id,first_name,last_name,email").in("id", userIds)
    : { data: [], error: null };
  if (profileError) throw new Error(profileError.message);
  const people = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  return (memberships ?? []).map((membership) => {
    const profile = people.get(membership.user_id);
    return {
      userId: membership.user_id,
      membershipId: membership.id,
      accessType: membership.access_type,
      name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || profile?.email || "User",
      email: profile?.email ?? "",
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
