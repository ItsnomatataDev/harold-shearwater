import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { HaroldModuleContext } from "@/features/harold/HaroldModuleContext";
import { getTeamBookingInbox } from "@/features/team/bookings/team-bookings-service";
import { TeamBookingsInboxPage } from "@/features/team/bookings/TeamBookingsInboxPage";

export const metadata = { title: "Booking Requests — Team" };

export default async function TeamBookingsPage() {
  const team = await requireTeamContext();
  if (!team?.membership.organizationId) redirect("/auth/continue");

  const inbox = await getTeamBookingInbox(team.membership.organizationId);

  return (
    <div className="space-y-6">
      <HaroldModuleContext
        moduleId="bookings"
        summary={`Team booking inbox: ${inbox.summary.openEnquiries} open agent enquiries, ${inbox.summary.openRequests} open customer requests`}
      />
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-savannah">
          Operations
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          Booking requests
        </h1>
        <p className="mt-1 text-sm text-[#666]">
          Review agent reservation requests and customer booking requests before
          confirming with GoldenDusk or your reservations team.
        </p>
      </header>
      <TeamBookingsInboxPage
        organizationId={team.membership.organizationId}
        enquiries={inbox.enquiries}
        requests={inbox.requests}
      />
    </div>
  );
}
