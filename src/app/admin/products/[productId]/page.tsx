import { redirect } from "next/navigation";
import { requireProductsView } from "@/features/products/access";
import { getProductWithDetails } from "@/features/products/products-service";
import TeamProductDetailPage from "@/features/products/components/TeamProductDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const team = await requireProductsView();
  if (!team) redirect("/access-pending");

  const { productId } = await params;
  const organizationId = team.membership.organizationId!;
  const product = await getProductWithDetails(organizationId, productId);

  if (!product) redirect("/admin/products");

  return (
    <TeamProductDetailPage product={product} basePath="/admin/products" />
  );
}
