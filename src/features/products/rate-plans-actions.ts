"use server";

import { revalidatePath } from "next/cache";
import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const planSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  plan_type: z.enum([
    "public",
    "agent_default",
    "agency_specific",
    "staff",
    "promotional",
  ]),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
});

export type RatePlanFormState = {
  error?: string;
  success?: boolean;
  planId?: string;
};

export async function addRatePlan(
  _prev: RatePlanFormState,
  formData: FormData,
): Promise<RatePlanFormState> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rate_plans")
    .insert({
      organization_id: ctx.membership.organizationId!,
      name: parsed.data.name,
      description: parsed.data.description || null,
      plan_type: parsed.data.plan_type,
      valid_from: parsed.data.valid_from || null,
      valid_until: parsed.data.valid_until || null,
      active: true,
      created_by: ctx.membership.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/products/rates");
  return { success: true, planId: data.id };
}

export async function updateRatePlan(
  planId: string,
  _prev: RatePlanFormState,
  formData: FormData,
): Promise<RatePlanFormState> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const parsed = planSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("rate_plans")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      plan_type: parsed.data.plan_type,
      valid_from: parsed.data.valid_from || null,
      valid_until: parsed.data.valid_until || null,
    })
    .eq("id", planId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) return { error: error.message };
  revalidatePath("/admin/products/rates");
  return { success: true };
}

export async function toggleRatePlanActive(
  planId: string,
  active: boolean,
): Promise<void> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) throw new Error("Admin access is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("rate_plans")
    .update({ active })
    .eq("id", planId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/products/rates");
}

const itemSchema = z.object({
  product_id: z.string().uuid("Invalid product"),
  variant_id: z.string().uuid().optional().or(z.literal("")),
  price_per_person: z.coerce.number().min(0, "Price must be >= 0"),
  currency: z.string().length(3).default("USD"),
  notes: z.string().optional(),
});

export async function addRatePlanItem(
  planId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("rate_plan_items").insert({
    rate_plan_id: planId,
    product_id: parsed.data.product_id,
    variant_id: parsed.data.variant_id || null,
    price_per_person: parsed.data.price_per_person,
    currency: parsed.data.currency,
    notes: parsed.data.notes || null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/products/rates/${planId}`);
  return {};
}

export async function deleteRatePlanItem(
  planId: string,
  itemId: string,
): Promise<void> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) throw new Error("Admin access is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("rate_plan_items")
    .delete()
    .eq("id", itemId)
    .eq("rate_plan_id", planId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/rates/${planId}`);
}

export async function assignRatePlanToAgency(
  membershipId: string,
  ratePlanId: string,
): Promise<{ error?: string }> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const supabase = await createClient();
  const [membershipResult, planResult] = await Promise.all([
    supabase
      .from("access_memberships")
      .select("id")
      .eq("id", membershipId)
      .eq("organization_id", ctx.membership.organizationId!)
      .eq("access_type", "agent")
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("rate_plans")
      .select("id")
      .eq("id", ratePlanId)
      .eq("organization_id", ctx.membership.organizationId!)
      .maybeSingle(),
  ]);
  if (membershipResult.error) return { error: membershipResult.error.message };
  if (planResult.error) return { error: planResult.error.message };
  if (!membershipResult.data || !planResult.data) {
    return { error: "Agent or rate plan not found." };
  }
  const { error } = await supabase.from("agency_rate_assignments").insert({
    organization_id: ctx.membership.organizationId!,
    membership_id: membershipId,
    rate_plan_id: ratePlanId,
    assigned_by: ctx.membership.id,
  });

  if (error) return { error: error.message };
  revalidatePath("/admin/products/rates");
  return {};
}

export async function removeRatePlanAssignment(
  assignmentId: string,
): Promise<{ error?: string }> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("agency_rate_assignments")
    .delete()
    .eq("id", assignmentId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) return { error: error.message };
  revalidatePath("/admin/products/rates");
  return {};
}
