import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProductsView } from "@/features/products/access";
import {
  getCatalogUsageSummary,
  getProducts,
} from "@/features/products/products-service";
import { getCatalogSyncSummary } from "@/features/integrations/catalog/catalog-sync-service";
import TeamProductsPage from "@/features/products/components/TeamProductsPage";

export const metadata: Metadata = { title: "Product Catalog | Admin" };

export default async function Page() {
  const team = await requireProductsView();
  if (!team) redirect("/access-pending");

  const organizationId = team.membership.organizationId!;
  const [products, usage, syncRuns] = await Promise.all([
    getProducts(organizationId),
    getCatalogUsageSummary(organizationId),
    getCatalogSyncSummary(organizationId),
  ]);

  return (
    <TeamProductsPage
      products={products}
      basePath="/admin/products"
      usage={usage}
      syncRuns={syncRuns}
    />
  );
}
