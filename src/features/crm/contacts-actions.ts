"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamContext } from "@/features/auth/services/auth-context";

const contactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().max(100).default(""),
  email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional(),
  nationality: z.string().trim().max(60).optional(),
  source: z
    .enum([
      "direct",
      "agent",
      "harold_chat",
      "referral",
      "walk_in",
      "website",
      "other",
    ])
    .optional(),
  sourceDetail: z.string().trim().max(200).optional(),
  status: z
    .enum(["lead", "prospect", "active", "past_guest", "vip", "lost"])
    .default("lead"),
  notes: z.string().trim().max(2000).optional(),
});

export async function addCrmContact(organizationId: string, input: unknown) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team Access is required.");
  }
  const parsed = contactSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("crm_contacts").insert({
    organization_id: organizationId,
    first_name: parsed.firstName,
    last_name: parsed.lastName,
    email: parsed.email || null,
    phone: parsed.phone || null,
    nationality: parsed.nationality || null,
    source: parsed.source || null,
    source_detail: parsed.sourceDetail || null,
    status: parsed.status,
    notes: parsed.notes || null,
    owner_membership_id: team.membership.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/team/crm");
}

export async function updateCrmContact(
  organizationId: string,
  contactId: string,
  input: unknown,
) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team access is required.");
  }
  const parsed = contactSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_contacts")
    .update({
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      email: parsed.email || null,
      phone: parsed.phone || null,
      nationality: parsed.nationality || null,
      source: parsed.source || null,
      source_detail: parsed.sourceDetail || null,
      status: parsed.status,
      notes: parsed.notes || null,
    })
    .eq("id", contactId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  revalidatePath("/team/crm");
  revalidatePath(`/team/crm/${contactId}`);
}

export async function deleteCrmContact(
  organizationId: string,
  contactId: string,
) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team access is required.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_contacts")
    .delete()
    .eq("id", contactId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  revalidatePath("/team/crm");
}

const activitySchema = z.object({
  type: z.enum(["note", "call", "email", "meeting", "task", "harold_chat"]),
  body: z.string().trim().min(1, "Activity body is required").max(4000),
  occurredAt: z.string().optional(),
});

export async function addCrmActivity(
  organizationId: string,
  contactId: string,
  input: unknown,
) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team access is required.");
  }
  const parsed = activitySchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("crm_activities").insert({
    organization_id: organizationId,
    contact_id: contactId,
    membership_id: team.membership.id,
    type: parsed.type,
    body: parsed.body,
    occurred_at: parsed.occurredAt ?? new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/team/crm/${contactId}`);
}

export async function updateCrmContactStatus(
  organizationId: string,
  contactId: string,
  status: "lead" | "prospect" | "active" | "past_guest" | "vip" | "lost",
) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team Access is required.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_contacts")
    .update({ status })
    .eq("id", contactId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  revalidatePath("/team/crm");
}
