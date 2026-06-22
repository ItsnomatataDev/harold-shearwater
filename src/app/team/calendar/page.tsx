import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { ModuleHeader } from "@/features/team/components/ModuleHeader";
import { getOperationsCalendarData } from "@/features/team/calendar/calendar-service";
import { OperationsCalendar } from "@/features/team/calendar/components/OperationsCalendar";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const team = await requireTeamContext(); if (!team?.membership.organizationId) redirect("/auth/continue");
  const { month } = await searchParams;
  const data = await getOperationsCalendarData(team.membership.organizationId, team.membership.id, team.context.userId, month);
  return <section className="space-y-6"><ModuleHeader title="Operations Calendar" description="One dependable view of your meetings and assigned duties, with month, week, and agenda planning."/><OperationsCalendar data={data}/></section>;
}
