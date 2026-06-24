import { createClient } from "@/lib/supabase/server";
import { isMissingDatabaseObject } from "@/lib/supabase/schema-errors";

export type Product = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  short_description: string | null;
  full_description: string | null;
  category: string;
  status: "draft" | "active" | "archived";
  min_party_size: number;
  max_party_size: number | null;
  duration_minutes: number | null;
  cover_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  active: boolean;
};

export type ProductInclusion = {
  id: string;
  product_id: string;
  label: string;
  inclusion_type: "included" | "excluded" | "requirement" | "restriction";
  sort_order: number;
};

export type ProductWithDetails = Product & {
  variants: ProductVariant[];
  inclusions: ProductInclusion[];
};

export async function getProducts(
  organizationId: string,
  status?: "draft" | "active" | "archived",
): Promise<Product[]> {
  const supabase = await createClient();
  let query = supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (status) {
    query = query.eq("status", status);
  } else {
    query = query.neq("status", "archived");
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingDatabaseObject(error)) return [];
    throw error;
  }
  return (data ?? []) as Product[];
}

export async function getProduct(
  organizationId: string,
  productId: string,
): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", productId)
    .single();
  if (error) return null;
  return data as Product;
}

export async function getProductWithDetails(
  organizationId: string,
  productId: string,
): Promise<ProductWithDetails | null> {
  const supabase = await createClient();
  const [productResult, variantsResult, inclusionsResult] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("id", productId)
      .single(),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
    supabase
      .from("product_inclusions")
      .select("*")
      .eq("product_id", productId)
      .order("sort_order"),
  ]);

  if (productResult.error || !productResult.data) return null;

  return {
    ...(productResult.data as Product),
    variants: (variantsResult.data ?? []) as ProductVariant[],
    inclusions: (inclusionsResult.data ?? []) as ProductInclusion[],
  };
}

export async function getActiveProductsByCategory(
  organizationId: string,
): Promise<Record<string, Product[]>> {
  const products = await getProducts(organizationId, "active");
  return products.reduce(
    (acc, product) => {
      if (!acc[product.category]) acc[product.category] = [];
      acc[product.category].push(product);
      return acc;
    },
    {} as Record<string, Product[]>,
  );
}
