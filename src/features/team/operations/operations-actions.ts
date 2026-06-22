"use server";

import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueAt: z.string().datetime().optional(),
});

const UpdateTaskSchema = z.object({
  taskId: z.string().uuid(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["open", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedTo: z.string().uuid().optional(),
  dueAt: z.string().datetime().optional(),
});

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, any>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("audit_logs").insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function createTask(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = CreateTaskSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      organization_id: organizationId,
      title: parsed.title,
      description: parsed.description || null,
      priority: parsed.priority,
      due_at: parsed.dueAt || null,
      created_by: user.id,
      status: "open",
    })
    .select("id")
    .single();

  if (error) throw error;

  await logAudit(supabase, organizationId, "task.created", "tasks", task.id, {
    title: parsed.title,
    priority: parsed.priority,
  });

  return { success: true, taskId: task.id };
}

export async function updateTask(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = UpdateTaskSchema.parse(input);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const updates: Record<string, any> = {};
  if (parsed.title !== undefined) updates.title = parsed.title;
  if (parsed.description !== undefined)
    updates.description = parsed.description;
  if (parsed.status !== undefined) {
    updates.status = parsed.status;
    if (parsed.status === "completed") {
      updates.completed_at = new Date().toISOString();
    }
  }
  if (parsed.priority !== undefined) updates.priority = parsed.priority;
  if (parsed.assignedTo !== undefined) updates.assigned_to = parsed.assignedTo;
  if (parsed.dueAt !== undefined) updates.due_at = parsed.dueAt;

  const { error } = await (supabase
    .from("tasks")
    .update(updates as any)
    .eq("id", parsed.taskId)
    .eq("organization_id", organizationId) as any);

  if (error) throw error;

  await logAudit(
    supabase,
    organizationId,
    "task.updated",
    "tasks",
    parsed.taskId,
    updates,
  );

  return { success: true };
}

export async function deleteTask(organizationId: string, taskId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", taskId)
    .eq("organization_id", organizationId);

  if (error) throw error;

  await logAudit(supabase, organizationId, "task.deleted", "tasks", taskId, {});

  return { success: true };
}
