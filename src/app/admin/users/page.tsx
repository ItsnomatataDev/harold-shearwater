import { redirect } from "next/navigation";
import { requirePlatformAdminContext } from "@/features/auth/services/auth-context";
import {
  getPlatformUsers,
  getTeamMemberOptions,
} from "@/features/admin/users/platform-users-service";
import { PlatformUsersDirectory } from "@/features/admin/users/PlatformUsersDirectory";

export const metadata = { title: "All Users | Platform Admin" };

export default async function PlatformUsersPage() {
  const admin = await requirePlatformAdminContext();
  if (!admin) redirect("/admin/dashboard");
  const [users, teamMembers] = await Promise.all([
    getPlatformUsers(),
    getTeamMemberOptions(),
  ]);
  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-gold">
          Platform Administrator
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">User monitoring</h1>
        <p className="mt-3 text-sm text-[#92928c]">
          Approve agents, assign key account assistants for Harold handovers, and
          monitor access across Team, Agent and Customer portals.
        </p>
      </header>
      <PlatformUsersDirectory users={users} teamMembers={teamMembers} />
    </section>
  );
}
