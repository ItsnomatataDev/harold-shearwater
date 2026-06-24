"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeamContext, getAuthContext } from "@/features/auth/services/auth-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type DeliverDocumentState = { error?: string; success?: boolean };

const recipientSchema = z.object({
  userId: z.string().uuid(),
  membershipId: z.string().uuid(),
  accessType: z.enum(["team", "agent", "customer"]),
});

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "document";
}

export async function deliverDocument(_previous: DeliverDocumentState, formData: FormData): Promise<DeliverDocumentState> {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) return { error: "Team Access is required." };
  const title = z.string().trim().min(1).max(200).safeParse(formData.get("title"));
  const description = z.string().trim().max(1000).safeParse(formData.get("description") ?? "");
  const documentType = z.enum(["voucher", "confirmation", "itinerary", "contract", "fact_sheet", "policy", "media", "general"]).safeParse(formData.get("document_type"));
  let recipients: Array<ReturnType<typeof recipientSchema.safeParse>>;
  try {
    recipients = formData.getAll("recipients").map((value) => recipientSchema.safeParse(JSON.parse(String(value))));
  } catch {
    return { error: "Invalid recipient selection." };
  }
  const file = formData.get("file");
  if (!title.success) return { error: "A document title is required." };
  if (!description.success || !documentType.success) return { error: "Invalid document details." };
  if (!recipients.length || recipients.some((item) => !item.success)) return { error: "Select at least one recipient." };
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a document to send." };
  if (file.size > 25 * 1024 * 1024) return { error: "Documents must be 25 MB or smaller." };

  const admin = createAdminClient();
  const parsedRecipients = recipients.map((item) => item.data!);
  const membershipIds = parsedRecipients.map((item) => item.membershipId);
  const { data: allowedMemberships, error: membershipError } = await admin
    .from("access_memberships")
    .select("id,user_id,access_type,organization_id")
    .in("id", membershipIds)
    .eq("status", "active");
  if (membershipError) return { error: membershipError.message };
  const allowed = new Map((allowedMemberships ?? []).filter((membership) => membership.access_type === "customer" || membership.organization_id === team.membership.organizationId).map((membership) => [membership.id, membership]));
  if (allowed.size !== new Set(membershipIds).size) return { error: "One or more recipients are not available." };

  const { data: document, error: documentError } = await admin.from("documents").insert({
    organization_id: team.membership.organizationId,
    title: title.data,
    description: description.data || null,
    content: "",
    category: "Document Inbox",
    status: "draft",
    created_by: team.context.userId,
    doc_type: documentType.data,
    owner_type: "team",
    owner_id: team.membership.id,
    uploaded_by: team.membership.id,
    file_name: file.name,
    mime_type: file.type || "application/octet-stream",
    file_size_bytes: file.size,
  }).select("id").single();
  if (documentError) return { error: documentError.message };

  const path = `${team.membership.organizationId}/${document.id}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const upload = await admin.storage.from("document-inbox").upload(path, await file.arrayBuffer(), { contentType: file.type || "application/octet-stream", upsert: false });
  if (upload.error) {
    await admin.from("documents").delete().eq("id", document.id);
    return { error: upload.error.message };
  }
  const { error: updateError } = await admin.from("documents").update({ file_url: path }).eq("id", document.id);
  if (updateError) return { error: updateError.message };

  const { error: deliveryError } = await admin.from("document_deliveries").insert(parsedRecipients.map((recipient) => ({
    organization_id: team.membership.organizationId!,
    document_id: document.id,
    recipient_user_id: recipient.userId,
    recipient_access: recipient.accessType,
    delivered_by: team.membership.id,
  })));
  if (deliveryError) return { error: deliveryError.message };
  revalidatePath("/team/inbox");
  revalidatePath("/agent/inbox");
  revalidatePath("/customer/inbox");
  return { success: true };
}

export async function markDocumentRead(deliveryId: string) {
  const context = await getAuthContext();
  if (!context) throw new Error("Authentication is required.");
  const id = z.string().uuid().parse(deliveryId);
  const { error } = await (await createClient()).from("document_deliveries").update({ read_at: new Date().toISOString() }).eq("id", id).eq("recipient_user_id", context.userId);
  if (error) throw new Error(error.message);
}
