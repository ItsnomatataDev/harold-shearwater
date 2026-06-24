import { requireTeamAdminContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";

export default async function Page({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  await params;
  const admin = await requireTeamAdminContext();
  redirect(admin ? "/admin/products/rates" : "/team/dashboard");
}
