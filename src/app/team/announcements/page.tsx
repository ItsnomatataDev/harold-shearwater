import { requireTeamContext } from "@/features/auth/services/auth-context";
import { redirect } from "next/navigation";
import { getAnnouncements } from "@/features/announcements/announcements-service";
import TeamAnnouncementsPage from "@/features/announcements/TeamAnnouncementsPage";

export const metadata = { title: "Announcements" };

export default async function Page() {
  const ctx = await requireTeamContext();
  if (!ctx) redirect("/auth");

  const announcements = await getAnnouncements(
    ctx.membership.organizationId!,
    true,
  );

  return <TeamAnnouncementsPage announcements={announcements} />;
}
