import { requireAgentContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";
import { getAgentCatalogByCategory } from "@/features/products/products-service";
import AgentCatalogPage from "@/features/products/components/AgentCatalogPage";
import { getAgentRatePlans } from "@/features/products/rate-plans-service";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";

export const metadata = { title: "Product Catalog" };

export default async function Page() {
  const ctx = await requireAgentContext();
  if (!ctx) redirect("/auth");

  const [byCategory, ratePlans] = await Promise.all([
    getAgentCatalogByCategory(),
    getAgentRatePlans(ctx.membership.id),
  ]);

  return (
    <>
      <HaroldModuleContext
        moduleId="products"
        summary={`Browsing the agent product catalog (${Object.keys(byCategory).length} categories, ${ratePlans.length} rate plans)`}
      />
      <AgentCatalogPage byCategory={byCategory} ratePlans={ratePlans} />
    </>
  );
}
