import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getAttendanceData } from "@/features/team/attendance/attendance-service";
import { AttendancePanel } from "@/features/team/attendance/components/AttendancePanel";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const data = await getAttendanceData(
    team.membership.organizationId,
    team.membership.id,
  );

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-sunset">
          Team Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Attendance
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Track clock-in, clock-out, and daily attendance history for your Team
          Access operations.
        </p>
      </header>

      <AttendancePanel
        organizationId={team.membership.organizationId}
        membershipId={team.membership.id}
        data={data}
      />
    </section>
  );
}
