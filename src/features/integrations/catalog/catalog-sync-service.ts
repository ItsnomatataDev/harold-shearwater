import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CatalogSyncResult,
  ExternalProductPayload,
  ExternalRatePlanPayload,
} from "./types";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function recordSyncRun(input: {
  organizationId: string;
  resourceType: "product" | "rate_plan" | "agency";
  externalSource: string;
  externalId: string;
  internalId: string | null;
  status: "received" | "applied" | "failed";
  payload: Record<string, unknown>;
  errorMessage?: string;
}) {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("catalog_sync_runs")
    .insert({
      organization_id: input.organizationId,
      resource_type: input.resourceType,
      external_source: input.externalSource,
      external_id: input.externalId,
      internal_id: input.internalId,
      status: input.status,
      payload: input.payload,
      error_message: input.errorMessage ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

type ProductRef = { id: string; name: string; external_id: string | null };
type ProductExternalIdCache = Map<string, ProductRef>;

async function loadProductExternalIdCache(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  externalSource: string,
): Promise<ProductExternalIdCache> {
  const { data, error } = await (admin as any)
    .from("products")
    .select("id,name,external_id")
    .eq("organization_id", organizationId)
    .eq("external_source", externalSource)
    .not("external_id", "is", null);
  if (error) throw new Error(error.message);

  const cache = new Map<string, ProductRef>();
  for (const row of data ?? []) {
    if (!row.external_id) continue;
    cache.set(row.external_id, row as ProductRef);
  }
  return cache;
}

async function findProductByExternalId(
  admin: ReturnType<typeof createAdminClient>,
  organizationId: string,
  externalSource: string,
  externalId: string,
  cache?: ProductExternalIdCache,
) {
  const cached = cache?.get(externalId);
  if (cached) {
    if (cached.external_id?.startsWith("ROOM-")) {
      throw new Error(
        `Rate plan item references room availability id ${externalId}; rates must reference products API activity ids.`,
      );
    }
    return cached;
  }

  const { data, error } = await (admin as any)
    .from("products")
    .select("id,name,external_id")
    .eq("organization_id", organizationId)
    .eq("external_source", externalSource)
    .eq("external_id", externalId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.external_id?.startsWith("ROOM-")) {
    throw new Error(
      `Rate plan item references room availability id ${externalId}; rates must reference products API activity ids.`,
    );
  }
  return data as { id: string; name: string; external_id: string | null } | null;
}

async function findVariantForRateItem(
  admin: ReturnType<typeof createAdminClient>,
  productId: string,
  variantExternalId: string,
) {
  const byExternalId = await (admin as any)
    .from("product_variants")
    .select("id,name,external_id")
    .eq("product_id", productId)
    .eq("external_id", variantExternalId)
    .maybeSingle();
  if (byExternalId.error) throw new Error(byExternalId.error.message);
  if (byExternalId.data) {
    return byExternalId.data as {
      id: string;
      name: string;
      external_id: string | null;
    };
  }

  const byName = await (admin as any)
    .from("product_variants")
    .select("id,name,external_id")
    .eq("product_id", productId)
    .eq("name", variantExternalId)
    .maybeSingle();
  if (byName.error) throw new Error(byName.error.message);
  return byName.data as {
    id: string;
    name: string;
    external_id: string | null;
  } | null;
}

export async function upsertExternalProduct(
  organizationId: string,
  payload: ExternalProductPayload,
): Promise<CatalogSyncResult> {
  const admin = createAdminClient() as any;
  const externalSource = payload.externalSource ?? "api";
  const runId = await recordSyncRun({
    organizationId,
    resourceType: "product",
    externalSource,
    externalId: payload.externalId,
    internalId: null,
    status: "received",
    payload: payload as unknown as Record<string, unknown>,
  });

  try {
    const { data: existing, error: existingError } = await admin
      .from("products")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("external_source", externalSource)
      .eq("external_id", payload.externalId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const productRow = {
      organization_id: organizationId,
      name: payload.name,
      slug: payload.slug ?? slugify(payload.name),
      short_description: payload.shortDescription ?? null,
      full_description: payload.fullDescription ?? null,
      category: payload.category ?? "adventure",
      status: payload.status ?? "active",
      min_party_size: payload.minPartySize ?? 1,
      max_party_size: payload.maxPartySize ?? null,
      duration_minutes: payload.durationMinutes ?? null,
      cover_image_url: payload.coverImageUrl ?? null,
      external_source: externalSource,
      external_id: payload.externalId,
      sync_status: "synced" as const,
      last_synced_at: new Date().toISOString(),
      sync_error: null,
      external_payload: payload.metadata ?? {},
    };

    const { data: product, error: productError } = existing
      ? await admin
          .from("products")
          .update(productRow)
          .eq("id", existing.id)
          .select("id")
          .single()
      : await admin.from("products").insert(productRow).select("id").single();
    if (productError) throw new Error(productError.message);

    if (payload.variants !== undefined) {
      const syncedVariantIds: string[] = [];
      for (const variant of payload.variants) {
        let existingVariant: { id: string } | null = null;
        if (variant.externalId) {
          const { data, error } = await admin
            .from("product_variants")
            .select("id")
            .eq("product_id", product.id)
            .eq("external_id", variant.externalId)
            .maybeSingle();
          if (error) throw new Error(error.message);
          existingVariant = data;
        }

        if (!existingVariant) {
          const { data, error } = await admin
            .from("product_variants")
            .select("id")
            .eq("product_id", product.id)
            .eq("name", variant.name)
            .maybeSingle();
          if (error) throw new Error(error.message);
          existingVariant = data;
        }

        const variantRow = {
          product_id: product.id,
          name: variant.name,
          description: variant.description ?? null,
          sort_order: variant.sortOrder ?? 0,
          active: variant.active ?? true,
          external_id: variant.externalId ?? null,
        };

        if (existingVariant) {
          const { data, error } = await admin
            .from("product_variants")
            .update(variantRow)
            .eq("id", existingVariant.id)
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          syncedVariantIds.push(data.id);
        } else {
          const { data, error } = await admin
            .from("product_variants")
            .insert(variantRow)
            .select("id")
            .single();
          if (error) throw new Error(error.message);
          syncedVariantIds.push(data.id);
        }
      }

      let staleVariantQuery = admin
        .from("product_variants")
        .update({ active: false })
        .eq("product_id", product.id);
      if (syncedVariantIds.length) {
        staleVariantQuery = staleVariantQuery.not(
          "id",
          "in",
          `(${syncedVariantIds.join(",")})`,
        );
      }
      const { error: staleVariantError } = await staleVariantQuery;
      if (staleVariantError) throw new Error(staleVariantError.message);
    }

    if (payload.inclusions?.length) {
      await admin.from("product_inclusions").delete().eq("product_id", product.id);
      await admin.from("product_inclusions").insert(
        payload.inclusions.map((inclusion, index) => ({
          product_id: product.id,
          label: inclusion.label,
          inclusion_type: inclusion.inclusionType ?? "included",
          sort_order: inclusion.sortOrder ?? index,
        })),
      );
    }

    await admin
      .from("catalog_sync_runs")
      .update({
        status: "applied",
        internal_id: product.id,
      })
      .eq("id", runId);

    return {
      runId,
      resourceType: "product",
      externalId: payload.externalId,
      internalId: product.id,
      status: "applied",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Product sync failed.";
    await admin
      .from("catalog_sync_runs")
      .update({ status: "failed", error_message: message })
      .eq("id", runId);
    await admin
      .from("products")
      .update({ sync_status: "error", sync_error: message })
      .eq("organization_id", organizationId)
      .eq("external_source", externalSource)
      .eq("external_id", payload.externalId);
    throw error;
  }
}

export async function upsertExternalRatePlan(
  organizationId: string,
  payload: ExternalRatePlanPayload,
  options?: { productCache?: ProductExternalIdCache },
): Promise<CatalogSyncResult> {
  const admin = createAdminClient() as any;
  const externalSource = payload.externalSource ?? "api";
  const productCache =
    options?.productCache ??
    (await loadProductExternalIdCache(admin, organizationId, externalSource));
  const runId = await recordSyncRun({
    organizationId,
    resourceType: "rate_plan",
    externalSource,
    externalId: payload.externalId,
    internalId: null,
    status: "received",
    payload: payload as unknown as Record<string, unknown>,
  });

  try {
    const { data: existing, error: existingError } = await admin
      .from("rate_plans")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("external_source", externalSource)
      .eq("external_id", payload.externalId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const planRow = {
      organization_id: organizationId,
      name: payload.name,
      description: payload.description ?? null,
      plan_type: payload.planType ?? "public",
      valid_from: payload.validFrom ?? null,
      valid_until: payload.validUntil ?? null,
      active: payload.active ?? true,
      external_source: externalSource,
      external_id: payload.externalId,
      sync_status: "synced" as const,
      last_synced_at: new Date().toISOString(),
      sync_error: null,
      external_payload: payload.metadata ?? {},
    };

    const { data: plan, error: planError } = existing
      ? await admin
          .from("rate_plans")
          .update(planRow)
          .eq("id", existing.id)
          .select("id")
          .single()
      : await admin.from("rate_plans").insert(planRow).select("id").single();
    if (planError) throw new Error(planError.message);

    if (payload.items !== undefined) {
      const itemRows = [];
      for (const item of payload.items) {
        const product = await findProductByExternalId(
          admin,
          organizationId,
          externalSource,
          item.productExternalId,
          productCache,
        );
        if (!product) {
          throw new Error(
            `Rate plan item references unknown product external id ${item.productExternalId}.`,
          );
        }

        let variantId: string | null = null;
        if (item.variantExternalId) {
          const variant = await findVariantForRateItem(
            admin,
            product.id,
            item.variantExternalId,
          );
          if (!variant) {
            throw new Error(
              `Rate plan item references unknown variant external id ${item.variantExternalId} for product ${item.productExternalId}.`,
            );
          }
          variantId = variant.id;
        }

        itemRows.push({
          rate_plan_id: plan.id,
          product_id: product.id,
          variant_id: variantId,
          price_per_person: item.pricePerPerson,
          currency: item.currency ?? "USD",
          notes: item.notes ?? null,
        });
      }

      const { error: deleteItemsError } = await admin
        .from("rate_plan_items")
        .delete()
        .eq("rate_plan_id", plan.id);
      if (deleteItemsError) throw new Error(deleteItemsError.message);

      if (itemRows.length) {
        const { error: insertItemsError } = await admin
          .from("rate_plan_items")
          .insert(itemRows);
        if (insertItemsError) throw new Error(insertItemsError.message);
      }
    }

    if (payload.agencyExternalIds?.length) {
      await syncAgencyRateAssignments(
        admin,
        organizationId,
        plan.id,
        externalSource,
        payload.agencyExternalIds,
      );
    }

    await admin
      .from("catalog_sync_runs")
      .update({
        status: "applied",
        internal_id: plan.id,
      })
      .eq("id", runId);

    return {
      runId,
      resourceType: "rate_plan",
      externalId: payload.externalId,
      internalId: plan.id,
      status: "applied",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rate plan sync failed.";
    await admin
      .from("catalog_sync_runs")
      .update({ status: "failed", error_message: message })
      .eq("id", runId);
    await admin
      .from("rate_plans")
      .update({ sync_status: "error", sync_error: message })
      .eq("organization_id", organizationId)
      .eq("external_source", externalSource)
      .eq("external_id", payload.externalId);
    throw error;
  }
}

export async function getCatalogSyncSummary(organizationId: string) {
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("catalog_sync_runs")
    .select("id,resource_type,external_source,external_id,status,created_at,error_message")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function syncAgencyRateAssignments(
  admin: ReturnType<typeof createAdminClient>,
  shearwaterOrganizationId: string,
  ratePlanId: string,
  externalSource: string,
  agencyExternalIds: string[],
) {
  for (const agencyExternalId of agencyExternalIds) {
    const { data: agencyOrg, error: agencyError } = await (admin as any)
      .from("organizations")
      .select("id")
      .eq("type", "agency")
      .eq("external_source", externalSource)
      .eq("external_id", agencyExternalId)
      .maybeSingle();
    if (agencyError) throw new Error(agencyError.message);
    if (!agencyOrg) {
      throw new Error(
        `Unknown agency external id ${agencyExternalId}. Sync the agency company first.`,
      );
    }

    const { data: membership, error: membershipError } = await (admin as any)
      .from("access_memberships")
      .select("id")
      .eq("organization_id", agencyOrg.id)
      .eq("access_type", "agent")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (membershipError) throw new Error(membershipError.message);
    if (!membership) {
      throw new Error(
        `Agency ${agencyExternalId} has no active agent membership to receive rates.`,
      );
    }

    const { error } = await (admin as any)
      .from("agency_rate_assignments")
      .upsert(
        {
          organization_id: shearwaterOrganizationId,
          membership_id: membership.id,
          rate_plan_id: ratePlanId,
        },
        { onConflict: "membership_id,rate_plan_id" },
      );
    if (error) throw new Error(error.message);
  }
}

export async function upsertExternalAgency(
  organizationId: string,
  payload: import("./types").ExternalAgencyPayload,
): Promise<CatalogSyncResult> {
  const admin = createAdminClient() as any;
  const externalSource = payload.externalSource ?? "api";
  const runId = await recordSyncRun({
    organizationId,
    resourceType: "agency",
    externalSource,
    externalId: payload.externalId,
    internalId: null,
    status: "received",
    payload: payload as unknown as Record<string, unknown>,
  });

  try {
    const { data: existing, error: existingError } = await admin
      .from("organizations")
      .select("id")
      .eq("type", "agency")
      .eq("external_source", externalSource)
      .eq("external_id", payload.externalId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);

    const agencyRow = {
      name: payload.name,
      slug:
        payload.slug ??
        payload.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      type: "agency" as const,
      timezone: payload.timezone ?? "Africa/Harare",
      active: payload.active ?? true,
      external_source: externalSource,
      external_id: payload.externalId,
    };

    const { data: agency, error: agencyError } = existing
      ? await admin
          .from("organizations")
          .update(agencyRow)
          .eq("id", existing.id)
          .select("id")
          .single()
      : await admin.from("organizations").insert(agencyRow).select("id").single();
    if (agencyError) throw new Error(agencyError.message);

    await admin
      .from("catalog_sync_runs")
      .update({ status: "applied", internal_id: agency.id })
      .eq("id", runId);

    return {
      runId,
      resourceType: "agency",
      externalId: payload.externalId,
      internalId: agency.id,
      status: "applied",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agency sync failed.";
    await admin
      .from("catalog_sync_runs")
      .update({ status: "failed", error_message: message })
      .eq("id", runId);
    throw error;
  }
}
