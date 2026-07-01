import { notFound, redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getTeamEnquiryDetail } from "@/features/team/bookings/team-bookings-service";
import { TeamEnquiryDetailPage } from "@/features/team/bookings/TeamEnquiryDetailPage";

export const metadata = { title: "Agent enquiry — Team" };

export default async function TeamEnquiryDetailRoute({
  params,
}: {
  params: Promise<{ enquiryId: string }>;
}) {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");

  const { enquiryId } = await params;
  const detail = await getTeamEnquiryDetail(
    team.membership.organizationId,
    enquiryId,
  );
  if (!detail) notFound();

  return (
    <TeamEnquiryDetailPage
      organizationId={team.membership.organizationId}
      {...detail}
    />
  );
}
