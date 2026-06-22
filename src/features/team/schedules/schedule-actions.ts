"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";

const createSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  locationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  supervisorMembershipId: z.string().uuid().optional(),
  assigneeIds: z.array(z.string().uuid()).min(1),
});

async function managerGuard(organizationId: string) {
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) throw new Error("Team Access is required.");
  if (!(await hasOrganizationPermission(organizationId, "schedules.manage"))) throw new Error("You do not have permission to manage schedules.");
  return team;
}

export async function createDuty(organizationId: string, input: unknown) {
  const parsed = createSchema.parse(input);
  if (new Date(parsed.endsAt) <= new Date(parsed.startsAt)) throw new Error("Duty end time must be after its start time.");
  const team = await managerGuard(organizationId);
  const supabase = await createClient();
  const memberIdsToValidate = Array.from(new Set([...parsed.assigneeIds, ...(parsed.supervisorMembershipId ? [parsed.supervisorMembershipId] : [])]));
  const { data: validMembers, error: memberError } = await supabase.from("access_memberships").select("id").eq("organization_id", organizationId).eq("access_type", "team").eq("status", "active").in("id", memberIdsToValidate);
  if (memberError) throw new Error(memberError.message);
  if ((validMembers ?? []).length !== memberIdsToValidate.length) throw new Error("One or more assignees or the supervisor are not active members of this organization.");
  if (parsed.locationId) {
    const { data } = await supabase.from("locations").select("id").eq("id", parsed.locationId).eq("organization_id", organizationId).maybeSingle();
    if (!data) throw new Error("The selected location does not belong to this organization.");
  }
  if (parsed.departmentId) {
    const { data } = await supabase.from("departments").select("id").eq("id", parsed.departmentId).eq("organization_id", organizationId).maybeSingle();
    if (!data) throw new Error("The selected department does not belong to this organization.");
  }
  const { data: duty, error } = await supabase.from("schedules").insert({
    organization_id: organizationId,
    title: parsed.title,
    description: parsed.description || null,
    starts_at: parsed.startsAt,
    ends_at: parsed.endsAt,
    location_id: parsed.locationId || null,
    department_id: parsed.departmentId || null,
    supervisor_membership_id: parsed.supervisorMembershipId || null,
    created_by: team.context.userId,
  }).select("id").single();
  if (error) throw new Error(error.message);
  const { error: assignmentError } = await supabase.from("schedule_assignments").insert(parsed.assigneeIds.map((membershipId) => ({ schedule_id: duty.id, membership_id: membershipId, assigned_by: team.context.userId })));
  if (assignmentError) throw new Error(assignmentError.message);
  await supabase.from("audit_logs").insert({ organization_id: organizationId, actor_user_id: team.context.userId, action: "schedule.created", entity_type: "schedules", entity_id: duty.id, metadata: { title: parsed.title, assignees: parsed.assigneeIds.length } });
  revalidatePath("/team/schedules");
  revalidatePath("/team/dashboard");
  return { id: duty.id };
}

export async function completeDuty(scheduleId: string) {
  const team = await requireTeamContext();
  if (!team) throw new Error("Team Access is required.");
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_assignments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("schedule_id", scheduleId).eq("membership_id", team.membership.id);
  if (error) throw new Error(error.message);
  revalidatePath("/team/schedules");
  revalidatePath("/team/dashboard");
}

export async function addHandoverNote(scheduleId: string, body: string) {
  const team = await requireTeamContext();
  if (!team) throw new Error("Team Access is required.");
  const content = z.string().trim().min(2).max(3000).parse(body);
  const { error } = await (await createClient()).from("duty_handover_notes").insert({ schedule_id: scheduleId, author_membership_id: team.membership.id, body: content });
  if (error) throw new Error(error.message);
  revalidatePath("/team/schedules");
}
