import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";
import { getProducts } from "@/features/products/products-service";
import TeamProductsPage from "@/features/products/components/TeamProductsPage";

export const metadata = { title: "Products | Admin" };

export default async function Page() {
  const admin = await requireTeamAdminContext();
  if (!admin?.membership.organizationId) redirect("/team/dashboard");

  const products = await getProducts(admin.membership.organizationId);

  return <TeamProductsPage products={products} />;
}
