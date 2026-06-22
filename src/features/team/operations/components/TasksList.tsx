"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
import type { TaskItem } from "../operations-service";
import { updateTask, deleteTask } from "../operations-actions";

const statusColors = {
  open: { bg: "bg-victoria/10", text: "text-victoria", label: "Open" },
  in_progress: { bg: "bg-gold/10", text: "text-gold", label: "In Progress" },
  completed: {
    bg: "bg-savannah/10",
    text: "text-savannah",
    label: "Completed",
  },
  cancelled: { bg: "bg-sunset/10", text: "text-sunset", label: "Cancelled" },
};

const priorityColors = {
  low: { text: "text-[#888880]", label: "Low" },
  medium: { text: "text-gold", label: "Medium" },
  high: { text: "text-sunset", label: "High" },
  urgent: { text: "text-[#ef5350]", label: "Urgent" },
};

export function TasksList({
  tasks,
  organizationId,
}: {
  tasks: TaskItem[];
  organizationId: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "open" | "completed">("all");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = tasks.filter((t) => {
    if (filter === "open")
      return t.status === "open" || t.status === "in_progress";
    if (filter === "completed") return t.status === "completed";
    return true;
  });

  async function handleStatusChange(taskId: string, newStatus: any) {
    setLoading(true);
    setError(null);
    try {
      await updateTask(organizationId, { taskId, status: newStatus });
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to update task",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        {(["all", "open", "completed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[.09em] transition ${
              filter === f
                ? "bg-sunset text-white"
                : "border border-[#343431] bg-[#232321] text-[#d6d6cf] hover:bg-[#30302e]"
            }`}
          >
            {f === "all" ? "All" : f === "open" ? "Active" : "Completed"} (
            {
              tasks.filter((t) => {
                if (f === "open")
                  return t.status === "open" || t.status === "in_progress";
                if (f === "completed") return t.status === "completed";
                return true;
              }).length
            }
            )
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length ? (
          filtered.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-[#343431] bg-[#1d1d1b] p-4 transition hover:border-[#484843]"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {task.title}
                  </p>
                  {task.description && (
                    <p className="mt-1 text-xs text-[#8a8a84]">
                      {task.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[.09em] ${
                        statusColors[task.status as keyof typeof statusColors]
                          .bg
                      } ${
                        statusColors[task.status as keyof typeof statusColors]
                          .text
                      }`}
                    >
                      {
                        statusColors[task.status as keyof typeof statusColors]
                          .label
                      }
                    </span>
                    <span
                      className={`rounded-full bg-[#2a2a27] px-2 py-1 text-[9px] font-bold uppercase tracking-[.09em] ${
                        priorityColors[
                          task.priority as keyof typeof priorityColors
                        ].text
                      }`}
                    >
                      {
                        priorityColors[
                          task.priority as keyof typeof priorityColors
                        ].label
                      }
                    </span>
                    {task.assignedToName && (
                      <span className="rounded-full bg-victoria/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[.09em] text-victoria">
                        {task.assignedToName}
                      </span>
                    )}
                    {task.dueAt && (
                      <span className="rounded-full bg-[#2a2a27] px-2 py-1 text-[9px] text-[#8a8a84]">
                        Due {new Date(task.dueAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <select
                  disabled={loading}
                  value={task.status}
                  onChange={(e) => handleStatusChange(task.id, e.target.value)}
                  className="ml-4 rounded-lg border border-[#3a3a36] bg-[#232321] px-3 py-2 text-xs text-white focus:border-victoria focus:outline-none disabled:opacity-50"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-[#343431] bg-[#1d1d1b] px-6 py-12 text-center">
            <p className="text-sm text-[#8a8a84]">
              No tasks {filter !== "all" && `in ${filter}`} status
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
