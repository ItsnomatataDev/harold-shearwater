import { notFound, redirect } from "next/navigation";
import { requireAccessContext } from "@/features/auth/services/auth-context";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";
import { getOperatingProductDetail } from "@/features/products/products-service";
import { getCustomerProductReviews } from "@/features/products/reviews-service";
import { ProductDetailView } from "@/features/products/components/ProductDetailView";

export const metadata = { title: "Experience details" };

export default async function CustomerProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const customer = await requireAccessContext("customer");
  if (!customer) redirect("/auth/continue");

  const { productId } = await params;
  const [product, reviews] = await Promise.all([
    getOperatingProductDetail(productId),
    getCustomerProductReviews(),
  ]);

  if (!product || product.status !== "active") notFound();

  return (
    <div className="space-y-6">
      <HaroldModuleContext
        moduleId="explore"
        summary={`Customer is viewing the "${product.name}" experience`}
        data={{ productId: product.id, productName: product.name }}
      />
      <ProductDetailView
        product={product}
        reviews={reviews.filter((review) => review.productId === product.id)}
        audience="customer"
        backHref="/customer/explore"
        backLabel="Back to explore"
      />
    </div>
  );
}
