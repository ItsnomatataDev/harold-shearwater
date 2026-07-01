import { notFound, redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getTeamBookingRequestDetail } from "@/features/team/bookings/team-bookings-service";
import { TeamBookingRequestDetailPage } from "@/features/team/bookings/TeamBookingRequestDetailPage";

export const metadata = { title: "Booking request — Team" };

export default async function TeamBookingRequestDetailRoute({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");

  const { requestId } = await params;
  const request = await getTeamBookingRequestDetail(
    team.membership.organizationId,
    requestId,
  );
  if (!request) notFound();

  return (
    <TeamBookingRequestDetailPage
      organizationId={team.membership.organizationId}
      request={request}
    />
  );
}
