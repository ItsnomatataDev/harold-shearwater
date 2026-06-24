"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import type { EnquiryStatus } from "./enquiries-service";

const enquirySchema = z.object({
  contactName: z.string().trim().min(1, "Contact name is required").max(150),
  contactEmail: z.string().trim().email().optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional(),
  partySize: z.coerce.number().int().min(1).default(1),
  productInterest: z.string().trim().max(200).optional(),
  requestedDate: z.string().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export async function addAgentEnquiry(organizationId: string, input: unknown) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    throw new Error("Agent access is required.");
  }
  const parsed = enquirySchema.parse(input);
  const supabase = await createClient();
  const reference = `SW-${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
  const modernInsert = await supabase
    .from("agent_enquiries")
    .insert({
      organization_id: organizationId,
      membership_id: agent.membership.id,
      reference,
      contact_name: parsed.contactName,
      contact_email: parsed.contactEmail || null,
      contact_phone: parsed.contactPhone || null,
      party_size: parsed.partySize,
      product_interest: parsed.productInterest || null,
      requested_date: parsed.requestedDate || null,
      notes: parsed.notes || null,
    })
    .select("id")
    .single();
  let enquiryId = modernInsert.data?.id;
  if (modernInsert.error) {
    if (!isMissingDatabaseObject(modernInsert.error)) {
      throw new Error(modernInsert.error.message);
    }
    const legacyInsert = await supabase
      .from("agent_enquiries")
      .insert({
        organization_id: organizationId,
        membership_id: agent.membership.id,
        contact_name: parsed.contactName,
        contact_email: parsed.contactEmail || null,
        contact_phone: parsed.contactPhone || null,
        party_size: parsed.partySize,
        product_interest: parsed.productInterest || null,
        requested_date: parsed.requestedDate || null,
        notes: parsed.notes || null,
      })
      .select("id")
      .single();
    if (legacyInsert.error) throw new Error(legacyInsert.error.message);
    enquiryId = legacyInsert.data.id;
  }
  if (!enquiryId) throw new Error("Unable to create enquiry.");
  const { error: eventError } = await supabase
    .from("agent_enquiry_events")
    .insert({
      organization_id: organizationId,
      enquiry_id: enquiryId,
      actor_membership_id: agent.membership.id,
      event_type: "created",
      body: `Enquiry ${reference} created for ${parsed.contactName}.`,
    });
  if (eventError && !isMissingDatabaseObject(eventError)) {
    throw new Error(eventError.message);
  }
  revalidatePath("/agent/enquiries");
}

export async function updateEnquiryStatus(
  organizationId: string,
  enquiryId: string,
  status: EnquiryStatus,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    throw new Error("Agent access is required.");
  }
  const supabase = await createClient();
  if (status === "confirmed") {
    const { data: enquiry, error: readError } = await supabase
      .from("agent_enquiries")
      .select("external_booking_reference")
      .eq("id", enquiryId)
      .eq("organization_id", organizationId)
      .eq("membership_id", agent.membership.id)
      .maybeSingle();
    if (readError && !isMissingDatabaseObject(readError)) {
      throw new Error(readError.message);
    }
    if (!readError && !enquiry?.external_booking_reference) {
      throw new Error(
        "Add the external booking reference before marking this enquiry confirmed.",
      );
    }
  }
  const { error } = await supabase
    .from("agent_enquiries")
    .update({ status })
    .eq("id", enquiryId)
    .eq("organization_id", organizationId)
    .eq("membership_id", agent.membership.id);
  if (error) throw new Error(error.message);
  const { error: eventError } = await supabase
    .from("agent_enquiry_events")
    .insert({
      organization_id: organizationId,
      enquiry_id: enquiryId,
      actor_membership_id: agent.membership.id,
      event_type: "status_changed",
      body: `Status changed to ${status.replaceAll("_", " ")}.`,
      metadata: { status },
    });
  if (eventError && !isMissingDatabaseObject(eventError)) {
    throw new Error(eventError.message);
  }
  revalidatePath("/agent/enquiries");
  revalidatePath(`/agent/enquiries/${enquiryId}`);
}

const noteSchema = z.object({
  enquiryId: z.string().uuid(),
  body: z.string().trim().min(1).max(3000),
});

export async function addEnquiryNote(
  organizationId: string,
  input: unknown,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    throw new Error("Agent access is required.");
  }
  const parsed = noteSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("agent_enquiry_events").insert({
    organization_id: organizationId,
    enquiry_id: parsed.enquiryId,
    actor_membership_id: agent.membership.id,
    event_type: "note",
    body: parsed.body,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/agent/enquiries/${parsed.enquiryId}`);
}

const commercialSchema = z.object({
  enquiryId: z.string().uuid(),
  quoteAmount: z.coerce.number().min(0).optional(),
  quoteCurrency: z.string().trim().length(3).default("USD"),
  externalBookingReference: z.string().trim().max(120).optional(),
  followUpAt: z.string().optional(),
});

export async function updateEnquiryCommercialDetails(
  organizationId: string,
  input: unknown,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    throw new Error("Agent access is required.");
  }
  const parsed = commercialSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_enquiries")
    .update({
      quote_amount: parsed.quoteAmount ?? null,
      quote_currency: parsed.quoteCurrency.toUpperCase(),
      external_booking_reference: parsed.externalBookingReference || null,
      follow_up_at: parsed.followUpAt || null,
    })
    .eq("id", parsed.enquiryId)
    .eq("organization_id", organizationId)
    .eq("membership_id", agent.membership.id);
  if (error) throw new Error(error.message);
  revalidatePath("/agent/enquiries");
  revalidatePath(`/agent/enquiries/${parsed.enquiryId}`);
}

const followupSchema = z.object({
  enquiryId: z.string().uuid(),
  kind: z.enum(["general", "post_sale", "review", "upsell"]),
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(2000).optional(),
  dueAt: z.string().optional(),
});

export async function addEnquiryFollowup(
  organizationId: string,
  input: unknown,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    throw new Error("Agent access is required.");
  }
  const parsed = followupSchema.parse(input);
  const supabase = await createClient();
  const { error } = await supabase.from("agent_enquiry_followups").insert({
    organization_id: organizationId,
    enquiry_id: parsed.enquiryId,
    membership_id: agent.membership.id,
    kind: parsed.kind,
    title: parsed.title,
    notes: parsed.notes || null,
    due_at: parsed.dueAt || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/agent/enquiries/${parsed.enquiryId}`);
}

export async function completeEnquiryFollowup(
  organizationId: string,
  enquiryId: string,
  followupId: string,
) {
  const agent = await requireAgentContext();
  if (!agent || agent.membership.organizationId !== organizationId) {
    throw new Error("Agent access is required.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("agent_enquiry_followups")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", followupId)
    .eq("enquiry_id", enquiryId)
    .eq("membership_id", agent.membership.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/agent/enquiries/${enquiryId}`);
}
