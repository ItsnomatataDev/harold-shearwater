"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import type { DealStage } from "./deals-service";

const dealSchema = z.object({
  contactId: z.string().uuid("Invalid contact"),
  title: z.string().trim().min(1, "Title is required").max(200),
  value: z.coerce.number().positive().optional().or(z.literal("")),
  currency: z.string().trim().max(8).default("USD"),
  stage: z
    .enum(["enquiry", "quoted", "confirmed", "complete", "lost"])
    .default("enquiry"),
  closeDate: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

function revalidate(contactId?: string) {
  revalidatePath("/team/crm/deals");
  if (contactId) revalidatePath(`/team/crm/${contactId}`);
}

export async function addCrmDeal(organizationId: string, input: unknown) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team access is required.");
  }
  const parsed = dealSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("crm_deals").insert({
    organization_id: organizationId,
    contact_id: parsed.contactId,
    owner_membership_id: team.membership.id,
    title: parsed.title,
    value: parsed.value || null,
    currency: parsed.currency || "USD",
    stage: parsed.stage,
    close_date: parsed.closeDate || null,
    notes: parsed.notes || null,
  });
  if (error) throw new Error(error.message);
  revalidate(parsed.contactId);
}

export async function updateCrmDealStage(
  organizationId: string,
  dealId: string,
  stage: DealStage,
  contactId?: string,
) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team access is required.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deals")
    .update({ stage })
    .eq("id", dealId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  revalidate(contactId);
}

export async function updateCrmDeal(
  organizationId: string,
  dealId: string,
  input: unknown,
) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team access is required.");
  }
  const parsed = dealSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deals")
    .update({
      title: parsed.title,
      value: parsed.value || null,
      currency: parsed.currency || "USD",
      stage: parsed.stage,
      close_date: parsed.closeDate || null,
      notes: parsed.notes || null,
    })
    .eq("id", dealId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  revalidate(parsed.contactId);
}

export async function deleteCrmDeal(
  organizationId: string,
  dealId: string,
  contactId?: string,
) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) {
    throw new Error("Team access is required.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_deals")
    .delete()
    .eq("id", dealId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
  revalidate(contactId);
}
