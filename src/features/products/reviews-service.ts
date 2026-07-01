import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";
import { getOperatingOrganizationId } from "@/features/products/products-service";

export interface ProductReviewSummary {
  id: string;
  productId: string | null;
  customerName: string;
  rating: number;
  title: string | null;
  body: string | null;
  visitDate: string | null;
}

export async function getPublishedProductReviews(
  organizationId: string,
): Promise<ProductReviewSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id,product_id,customer_name,rating,title,body,visit_date")
    .eq("organization_id", organizationId)
    .eq("status", "published")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingDatabaseObject(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((review) => ({
    id: review.id,
    productId: review.product_id,
    customerName: review.customer_name,
    rating: review.rating,
    title: review.title,
    body: review.body,
    visitDate: review.visit_date,
  }));
}

export async function getAgentProductReviews(): Promise<ProductReviewSummary[]> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return [];
  return getPublishedProductReviews(organizationId);
}

export async function getCustomerProductReviews(): Promise<
  ProductReviewSummary[]
> {
  const organizationId = await getOperatingOrganizationId();
  if (!organizationId) return [];
  return getPublishedProductReviews(organizationId);
}
