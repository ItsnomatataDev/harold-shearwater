import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { NotificationCentre } from "@/features/team/notifications/components/NotificationCentre";
import { getNotificationCentreData } from "@/features/team/notifications/notification-service";

export const metadata: Metadata = { title: "Notifications | Agent Access" };

export default async function AgentNotificationsPage() {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) redirect("/auth/continue");

  const data = await getNotificationCentreData(
    agent.membership.organizationId,
    agent.context.userId,
  );

  return (
    <section className="space-y-6">
      <ModuleHeader
        eyebrow="Agent Access · Live activity"
        title="Notification centre"
        description="Track enquiry progress, new inbox messages, rate assignments and account updates in one place."
      />
      <NotificationCentre
        organizationId={agent.membership.organizationId}
        portalName="Agent Access"
        initialNotifications={data.notifications}
        initialPreferences={data.preferences}
      />
    </section>
  );
}
