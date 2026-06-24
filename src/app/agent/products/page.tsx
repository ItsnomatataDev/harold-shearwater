import { requireAgentContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";
import { getActiveProductsByCategory } from "@/features/products/products-service";
import AgentCatalogPage from "@/features/products/components/AgentCatalogPage";
import { getAgentRatePlans } from "@/features/products/rate-plans-service";
import { getPublishedProductReviews } from "@/features/products/reviews-service";

export const metadata = { title: "Product Catalog" };

export default async function Page() {
  const ctx = await requireAgentContext();
  if (!ctx) redirect("/auth");

  const [byCategory, ratePlans, reviews] = await Promise.all([
    getActiveProductsByCategory(ctx.membership.organizationId!),
    getAgentRatePlans(ctx.membership.organizationId!, ctx.membership.id),
    getPublishedProductReviews(ctx.membership.organizationId!),
  ]);

  return <AgentCatalogPage byCategory={byCategory} ratePlans={ratePlans} reviews={reviews} />;
}
