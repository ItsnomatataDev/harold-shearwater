import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getAttendanceData } from "@/features/team/attendance/attendance-service";
import { AttendancePanel } from "@/features/team/attendance/components/AttendancePanel";
import { hasOrganizationPermission } from "@/features/auth/services/auth-context";
import { getAdminAttendanceRegisterData } from "@/features/admin/attendance/attendance-register-service";
import { AdminAttendanceRegister } from "@/features/admin/attendance/components/AdminAttendanceRegister";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const canManage = await hasOrganizationPermission(
    team.membership.organizationId,
    "attendance.manage",
  );
  const [data, register] = await Promise.all([
    getAttendanceData(team.membership.organizationId, team.membership.id),
    canManage
      ? getAdminAttendanceRegisterData(team.membership.organizationId)
      : Promise.resolve(null),
  ]);

  return (
    <section className="space-y-6">
      <ModuleHeader title="Attendance" description="Clock in, review your hours, and—when authorized—monitor today's live staff register." />

      <AttendancePanel
        organizationId={team.membership.organizationId}
        membershipId={team.membership.id}
        data={data}
      />
      {register && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-gold">Manager view</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Attendance Register</h2>
          </div>
          <AdminAttendanceRegister data={register} />
        </div>
      )}
    </section>
  );
}
