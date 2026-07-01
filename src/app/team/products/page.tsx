import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireProductsView } from "@/features/products/access";
import {
  getCatalogUsageSummary,
  getProducts,
} from "@/features/products/products-service";
import { getCatalogSyncSummary } from "@/features/integrations/catalog/catalog-sync-service";
import TeamProductsPage from "@/features/products/components/TeamProductsPage";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";

export const metadata: Metadata = { title: "Products" };

export default async function Page() {
  const team = await requireProductsView();
  if (!team) redirect("/team/dashboard");

  const organizationId = team.membership.organizationId!;
  const [products, usage, syncRuns] = await Promise.all([
    getProducts(organizationId),
    getCatalogUsageSummary(organizationId),
    getCatalogSyncSummary(organizationId),
  ]);

  return (
    <>
      <HaroldModuleContext
        moduleId="products"
        summary={`Team product catalog (${products.length} products)`}
      />
      <TeamProductsPage
        products={products}
        basePath="/team/products"
        usage={usage}
        syncRuns={syncRuns}
      />
    </>
  );
}
