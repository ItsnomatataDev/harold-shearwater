import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { NotificationCentre } from "@/features/team/notifications/components/NotificationCentre";
import { getNotificationCentreData } from "@/features/team/notifications/notification-service";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");

  const data = await getNotificationCentreData(team.membership.organizationId);

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="Team Access · Live activity"
        title="Notification centre"
        description="Keep track of meeting invitations, schedule changes, announcements, knowledge updates and access activity across your Shearwater workspace."
      />
      <NotificationCentre
        initialNotifications={data.notifications}
        initialPreferences={data.preferences}
      />
    </section>
  );
}
