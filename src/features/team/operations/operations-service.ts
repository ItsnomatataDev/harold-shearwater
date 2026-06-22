import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type TaskStatus = Database["public"]["Enums"]["task_status"];
type TaskPriority = Database["public"]["Enums"]["task_priority"];

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdBy: string;
  assignedTo: string | null;
  assignedToName: string | null;
  dueAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getOperationsData(organizationId: string) {
  const supabase = await createClient();

  const tasksResult = await supabase
    .from("tasks")
    .select(
      `
      id,
      title,
      description,
      status,
      priority,
      created_by,
      assigned_to,
      due_at,
      completed_at,
      created_at,
      updated_at,
      profiles!assigned_to(first_name, last_name)
    `,
    )
    .eq("organization_id", organizationId)
    .order("due_at", { ascending: true, nullsFirst: false });

  if (tasksResult.error) throw new Error(tasksResult.error.message);

  const tasks: TaskItem[] = (tasksResult.data ?? []).map((t: any) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    createdBy: t.created_by,
    assignedTo: t.assigned_to,
    assignedToName: t.profiles
      ? `${t.profiles.first_name || ""} ${t.profiles.last_name || ""}`.trim()
      : null,
    dueAt: t.due_at,
    completedAt: t.completed_at,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  }));

  return { tasks };
}
