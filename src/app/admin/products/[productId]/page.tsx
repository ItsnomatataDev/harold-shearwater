import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";
import { getProductWithDetails } from "@/features/products/products-service";
import TeamProductDetailPage from "@/features/products/components/TeamProductDetailPage";

export default async function Page({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const admin = await requireTeamAdminContext();
  if (!admin?.membership.organizationId) redirect("/team/dashboard");

  const { productId } = await params;
  const product = await getProductWithDetails(
    admin.membership.organizationId,
    productId,
  );

  if (!product) redirect("/admin/products");

  return <TeamProductDetailPage product={product} />;
}
