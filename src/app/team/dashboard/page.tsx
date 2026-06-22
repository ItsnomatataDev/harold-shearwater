import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BasecampPage } from "@/features/basecamp/BasecampPage";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getBasecampData } from "@/features/basecamp/services/basecamp-service";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Page() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");
  const data = await getBasecampData(team.context, team.membership);
  return <BasecampPage data={data} />;
}
