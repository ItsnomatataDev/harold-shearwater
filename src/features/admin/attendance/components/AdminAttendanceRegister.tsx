"use client";

import { useMemo, useState } from "react";
import type {
  AdminAttendanceRegisterData,
  AdminAttendanceRow,
  AttendanceStatusFilter,
} from "../attendance-register-service";

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(minutes: number) {
  if (minutes <= 0) return "0m";

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (!hours) return `${remainder}m`;
  if (!remainder) return `${hours}h`;

  return `${hours}h ${remainder}m`;
}

function statusTone(status: AdminAttendanceRow["status"]) {
  if (status === "present") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }

  if (status === "clocked-out") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-300";
  }

  return "border-rose-500/30 bg-rose-500/10 text-rose-300";
}

export function AdminAttendanceRegister({
  data,
}: {
  data: AdminAttendanceRegisterData;
}) {
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [locationId, setLocationId] = useState<string>("all");
  const [status, setStatus] = useState<AttendanceStatusFilter>("all");

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return data.rows.filter((row) => {
      const queryMatch =
        !normalizedQuery ||
        row.fullName.toLowerCase().includes(normalizedQuery) ||
        row.email.toLowerCase().includes(normalizedQuery) ||
        row.jobTitle.toLowerCase().includes(normalizedQuery) ||
        (row.employeeNumber ?? "").toLowerCase().includes(normalizedQuery);

      const departmentMatch =
        departmentId === "all" || row.departmentId === departmentId;
      const locationMatch =
        locationId === "all" || row.locationId === locationId;
      const statusMatch = status === "all" || row.status === status;

      return queryMatch && departmentMatch && locationMatch && statusMatch;
    });
  }, [data.rows, departmentId, locationId, query, status]);

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b] p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8a8a84]">
              Search Staff
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, role, employee #"
              className="w-full rounded-xl border border-[#343431] bg-[#151514] px-3 py-2 text-sm text-white outline-none ring-0 placeholder:text-[#686862] focus:border-gold"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8a8a84]">
              Department
            </span>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="w-full rounded-xl border border-[#343431] bg-[#151514] px-3 py-2 text-sm text-white outline-none ring-0 focus:border-gold"
            >
              <option value="all">All departments</option>
              {data.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8a8a84]">
              Location
            </span>
            <select
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              className="w-full rounded-xl border border-[#343431] bg-[#151514] px-3 py-2 text-sm text-white outline-none ring-0 focus:border-gold"
            >
              <option value="all">All locations</option>
              {data.locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#8a8a84]">
              Status
            </span>
            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as AttendanceStatusFilter)
              }
              className="w-full rounded-xl border border-[#343431] bg-[#151514] px-3 py-2 text-sm text-white outline-none ring-0 focus:border-gold"
            >
              <option value="all">All statuses</option>
              <option value="present">Present</option>
              <option value="clocked-out">Clocked out</option>
              <option value="absent">Absent</option>
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#343431] bg-[#1d1d1b]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#343431]">
            <thead className="bg-[#181816]">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-[#868680]">
                  Staff
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-[#868680]">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-[#868680]">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-[#868680]">
                  First In
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-[#868680]">
                  Last Out
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-[#868680]">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[.12em] text-[#868680]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#343431]">
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.membershipId} className="align-top">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-white">
                        {row.fullName}
                      </p>
                      <p className="mt-1 text-xs text-[#8d8d87]">
                        {row.email || "No email"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#71716b]">
                        {row.jobTitle}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#d2d2cc]">
                      {row.departmentName}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#d2d2cc]">
                      {row.locationName}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#d2d2cc]">
                      {formatDateTime(row.firstClockInAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#d2d2cc]">
                      {formatDateTime(row.lastClockOutAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#d2d2cc]">
                      {formatDuration(row.workedMinutes)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[.06em] ${statusTone(row.status)}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-[#8a8a84]"
                  >
                    No staff match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
