import { notFound, redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";
import { getOperatingProductDetail } from "@/features/products/products-service";
import { getDetailRatesForProduct } from "@/features/products/product-rates-service";
import { getAgentProductReviews } from "@/features/products/reviews-service";
import { ProductDetailView } from "@/features/products/components/ProductDetailView";
import { getGoldenDuskConnectionSummary } from "@/features/integrations/golden-dusk/agent-auth-service";

export const metadata = { title: "Product details" };

export default async function AgentProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const ctx = await requireAgentContext();
  if (!ctx) redirect("/auth");

  const { productId } = await params;
  const product = await getOperatingProductDetail(productId);
  if (!product || product.status !== "active") notFound();

  const [rates, reviews, goldenDuskConnection] = await Promise.all([
    getDetailRatesForProduct(ctx.membership.id, product),
    getAgentProductReviews(),
    getGoldenDuskConnectionSummary(ctx.membership.id),
  ]);

  return (
    <div className="shell-content">
      <HaroldModuleContext
        moduleId="products"
        summary={`Agent is viewing the "${product.name}" product`}
        data={{ productId: product.id, productName: product.name }}
      />
      <ProductDetailView
        product={product}
        rates={rates}
        reviews={reviews.filter((review) => review.productId === product.id)}
        audience="agent"
        organizationId={ctx.membership.organizationId ?? undefined}
        goldenDuskConnected={goldenDuskConnection.connected}
        backHref="/agent/products"
        backLabel="Back to catalog"
      />
    </div>
  );
}
