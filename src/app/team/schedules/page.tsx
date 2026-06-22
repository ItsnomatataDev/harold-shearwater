import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { getOperationsData } from "@/features/team/operations/operations-service";
import { TasksList } from "@/features/team/operations/components/TasksList";
import { CreateTaskForm } from "@/features/team/operations/components/CreateTaskForm";

export const metadata: Metadata = { title: "My Schedules / Duties" };

export default async function SchedulesPage() {
  const team = await requireTeamContext();
  if (!team) redirect("/auth/continue");

  if (!team.membership.organizationId) {
    redirect("/auth/continue");
  }

  const { tasks } = await getOperationsData(team.membership.organizationId);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-[#343431] bg-[#1d1d1b] p-6 sm:p-7">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-sunset">
          Team Access
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-.03em] text-white">
          My Schedules / Duties
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#9a9a94]">
          Plan your duty timeline, track daily schedule items, and stay on top
          of assigned responsibilities.
        </p>
      </header>

      <CreateTaskForm organizationId={team.membership.organizationId} />

      <TasksList
        tasks={tasks}
        organizationId={team.membership.organizationId}
      />
    </section>
  );
}
