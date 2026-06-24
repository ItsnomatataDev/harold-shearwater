import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";

export default async function Page() {
  const admin = await requireTeamAdminContext();
  redirect(admin ? "/admin/products" : "/team/dashboard");
}
