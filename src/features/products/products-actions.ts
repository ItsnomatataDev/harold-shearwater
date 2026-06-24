"use server";

import { revalidatePath } from "next/cache";
import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const optionalPositiveInteger = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().int().positive().optional(),
);

const productSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    short_description: z.string().optional(),
    full_description: z.string().optional(),
    category: z.enum([
      "adventure",
      "scenic",
      "water",
      "cultural",
      "multi_activity",
      "transfer",
      "accommodation",
    ]),
    duration_minutes: optionalPositiveInteger,
    min_party_size: z.preprocess(
      (value) => (value === "" || value == null ? undefined : value),
      z.coerce.number().int().positive().default(1),
    ),
    max_party_size: optionalPositiveInteger,
    cover_image_url: z.string().url().optional().or(z.literal("")),
  })
  .superRefine((product, context) => {
    if (
      product.max_party_size !== undefined &&
      product.max_party_size < product.min_party_size
    ) {
      context.addIssue({
        code: "custom",
        path: ["max_party_size"],
        message: "Maximum party size must be at least the minimum party size",
      });
    }
  });

export type ProductFormState = {
  error?: string;
  success?: boolean;
  productId?: string;
};

export async function addProduct(
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const slug = slugify(parsed.data.name);

  const { data, error } = await supabase
    .from("products")
    .insert({
      organization_id: ctx.membership.organizationId!,
      name: parsed.data.name,
      slug,
      short_description: parsed.data.short_description || null,
      full_description: parsed.data.full_description || null,
      category: parsed.data.category,
      status: "draft" as const,
      min_party_size: parsed.data.min_party_size,
      max_party_size: parsed.data.max_party_size ?? null,
      duration_minutes: parsed.data.duration_minutes ?? null,
      cover_image_url: parsed.data.cover_image_url || null,
      created_by: ctx.membership.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true, productId: data.id };
}

export async function updateProduct(
  productId: string,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const parsed = productSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      short_description: parsed.data.short_description || null,
      full_description: parsed.data.full_description || null,
      category: parsed.data.category,
      min_party_size: parsed.data.min_party_size,
      max_party_size: parsed.data.max_party_size ?? null,
      duration_minutes: parsed.data.duration_minutes ?? null,
      cover_image_url: parsed.data.cover_image_url || null,
    })
    .eq("id", productId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) return { error: error.message };
  revalidatePath("/admin/products");
  return { success: true };
}

export async function setProductStatus(
  productId: string,
  status: "draft" | "active" | "archived",
): Promise<void> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) throw new Error("Admin access is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({ status })
    .eq("id", productId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
}

const variantSchema = z.object({
  name: z.string().min(1, "Variant name is required"),
  description: z.string().optional(),
  sort_order: z.coerce.number().min(0).default(0),
});

export async function addProductVariant(
  productId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const parsed = variantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").insert({
    product_id: productId,
    name: parsed.data.name,
    description: parsed.data.description || null,
    sort_order: parsed.data.sort_order,
    active: true,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/products/${productId}`);
  return {};
}

export async function deleteProductVariant(
  productId: string,
  variantId: string,
): Promise<void> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) throw new Error("Admin access is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_variants")
    .delete()
    .eq("id", variantId)
    .eq("product_id", productId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}`);
}

const inclusionSchema = z.object({
  label: z.string().min(1, "Label is required"),
  inclusion_type: z.enum([
    "included",
    "excluded",
    "requirement",
    "restriction",
  ]),
  sort_order: z.coerce.number().min(0).default(0),
});

export async function addProductInclusion(
  productId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) return { error: "Admin access is required." };

  const parsed = inclusionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("product_inclusions").insert({
    product_id: productId,
    label: parsed.data.label,
    inclusion_type: parsed.data.inclusion_type,
    sort_order: parsed.data.sort_order,
  });

  if (error) return { error: error.message };
  revalidatePath(`/admin/products/${productId}`);
  return {};
}

export async function deleteProductInclusion(
  productId: string,
  inclusionId: string,
): Promise<void> {
  const ctx = await requireTeamAdminContext();
  if (!ctx) throw new Error("Admin access is required.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("product_inclusions")
    .delete()
    .eq("id", inclusionId)
    .eq("product_id", productId);

  if (error) throw new Error(error.message);
  revalidatePath(`/admin/products/${productId}`);
}
