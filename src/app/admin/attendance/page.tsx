import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminPortalContext } from "@/features/auth/services/auth-context";
import { AdminAttendanceRegister } from "@/features/admin/attendance/components/AdminAttendanceRegister";
import { getAdminAttendanceRegisterData } from "@/features/admin/attendance/attendance-register-service";

export const metadata: Metadata = { title: "Admin Attendance Register" };

export default async function AdminAttendancePage() {
  const admin = await requireAdminPortalContext();
  if (!admin || !admin.membership.organizationId) redirect("/access-pending");

  const data = await getAdminAttendanceRegisterData(
    admin.membership.organizationId,
  );

  const presentCount = data.rows.filter(
    (row) => row.status === "present",
  ).length;
  const absentCount = data.rows.filter((row) => row.status === "absent").length;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Admin Portal
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          Attendance Register
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Live daily register for Team Access staff with shift visibility,
          attendance status, and filter controls for operations oversight.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-xs">
          <span className="rounded-full border border-[#343431] bg-[#151514] px-3 py-1.5 text-[#cbc9c2]">
            Total staff: {data.rows.length}
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-300">
            Present: {presentCount}
          </span>
          <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-rose-300">
            Absent: {absentCount}
          </span>
        </div>
      </header>

      <AdminAttendanceRegister data={data} />
    </section>
  );
}
