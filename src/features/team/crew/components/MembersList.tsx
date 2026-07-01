"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CrewOptions, TeamMember, Role } from "../crew-service";
import {
  assignRoleToMember,
  suspendMember,
  activateMember,
  updateStaffAssignment,
} from "../crew-actions";

export function MembersList({
  members,
  roles,
  organizationId,
  canManageMembers,
  canManageRoles,
  options,
}: {
  members: TeamMember[];
  roles: Role[];
  organizationId: string;
  canManageMembers: boolean;
  canManageRoles: boolean;
  options: CrewOptions;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleAction(
    action: "suspend" | "activate" | "assign",
    membershipId: string,
    roleId?: string,
  ) {
    if (!canManageMembers) {
      setError("You do not have permission to perform this action");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (action === "suspend") {
        await suspendMember(organizationId, { membershipId });
      } else if (action === "activate") {
        await activateMember(organizationId, { membershipId });
      } else if (action === "assign" && roleId) {
        await assignRoleToMember(organizationId, { membershipId, roleId });
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  const active = members.filter((m) => m.status === "active");
  const invited = members.filter((m) => m.status === "invited");
  const suspended = members.filter((m) => m.status === "suspended");
  const editingMember = members.find((member) => member.id === editingId) ?? null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </div>
      )}
      {editingMember && <StaffAssignmentEditor member={editingMember} members={active} options={options} loading={loading} cancel={() => setEditingId(null)} save={async (input) => { setLoading(true); setError(null); try { await updateStaffAssignment(organizationId, input); setEditingId(null); router.refresh(); } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update staff assignment."); } finally { setLoading(false); } }}/>} 

      <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b]">
        <div className="border-b border-[#343431] px-6 py-4">
          <h3 className="text-lg font-semibold text-white">
            Active Members ({active.length})
          </h3>
        </div>
        <div className="divide-y divide-[#343431]">
          {active.length ? (
            active.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">
                    {member.fullName}
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a84]">{member.email}</p>
                  <p className="mt-1 text-[10px] text-[#6f6f69]">{member.jobTitle} · {member.departmentName} · {member.locationName}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {member.roles.map((role) => (
                      <span
                        key={role.id}
                        className="rounded-full bg-gold/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[.09em] text-gold"
                      >
                        {role.name}
                      </span>
                    ))}
                  </div>
                </div>
                {canManageMembers && (
                  <div className="ml-4 flex gap-2">
                    <button disabled={loading} onClick={() => setEditingId(member.id)} className="rounded-lg border border-victoria/30 bg-victoria/10 px-3 py-2 text-xs font-semibold text-victoria">Edit assignment</button>
                    <select
                      disabled={loading || !canManageRoles}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAction("assign", member.id, e.target.value);
                        }
                      }}
                      className="rounded-lg border border-[#3a3a36] bg-[#232321] px-3 py-2 text-xs text-white focus:border-victoria focus:outline-none disabled:opacity-50"
                    >
                      <option value="">Assign role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <button
                      disabled={loading}
                      onClick={() => handleAction("suspend", member.id)}
                      className="rounded-lg border border-sunset/30 bg-sunset/10 px-3 py-2 text-xs font-semibold text-sunset transition hover:bg-sunset/20 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-[#8a8a84]">No active members</p>
            </div>
          )}
        </div>
      </div>

      {invited.length > 0 && (
        <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b]">
          <div className="border-b border-[#343431] px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              Team Access awaiting activation ({invited.length})
            </h3>
          </div>
          <div className="divide-y divide-[#343431]">
            {invited.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {member.email}
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a84]">
                    Access is not active yet
                  </p>
                </div>
                {canManageMembers && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("activate", member.id)}
                    className="rounded-lg border border-savannah/30 bg-savannah/10 px-3 py-2 text-xs font-semibold text-savannah transition hover:bg-savannah/20 disabled:opacity-50"
                  >
                    Activate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {suspended.length > 0 && (
        <div className="rounded-2xl border border-[#343431] bg-[#1d1d1b]">
          <div className="border-b border-[#343431] px-6 py-4">
            <h3 className="text-lg font-semibold text-white">
              Suspended ({suspended.length})
            </h3>
          </div>
          <div className="divide-y divide-[#343431]">
            {suspended.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between px-6 py-4"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {member.fullName}
                  </p>
                  <p className="mt-1 text-xs text-[#8a8a84]">{member.email}</p>
                </div>
                {canManageMembers && (
                  <button
                    disabled={loading}
                    onClick={() => handleAction("activate", member.id)}
                    className="rounded-lg border border-victoria/30 bg-victoria/10 px-3 py-2 text-xs font-semibold text-victoria transition hover:bg-victoria/20 disabled:opacity-50"
                  >
                    Reactivate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StaffAssignmentEditor({ member, members, options, loading, cancel, save }: { member: TeamMember; members: TeamMember[]; options: CrewOptions; loading: boolean; cancel: () => void; save: (input: unknown) => Promise<void> }) {
  return <form className="grid gap-4 rounded-2xl border border-victoria/30 bg-[#1d1d1b] p-5 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void save({ membershipId: member.id, departmentId: form.get("departmentId") || null, locationId: form.get("locationId") || null, managerMembershipId: form.get("managerMembershipId") || null, employeeNumber: form.get("employeeNumber") || null, jobTitle: form.get("jobTitle") || null, teamIds: form.getAll("teamIds") }); }}><div className="sm:col-span-2"><p className="text-xs font-semibold uppercase tracking-wider text-victoria">Staff assignment</p><h3 className="mt-2 text-lg font-semibold text-white">{member.fullName}</h3></div><Field label="Job title"><input name="jobTitle" defaultValue={member.jobTitle} className="input"/></Field><Field label="Employee number"><input name="employeeNumber" defaultValue={member.employeeNumber ?? ""} className="input"/></Field><Field label="Department"><select name="departmentId" defaultValue={member.departmentId ?? ""} className="input"><option value="">Unassigned</option>{options.departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Primary location"><select name="locationId" defaultValue={member.locationId ?? ""} className="input"><option value="">Unassigned</option>{options.locations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label="Reports to"><select name="managerMembershipId" defaultValue={member.managerMembershipId ?? ""} className="input"><option value="">Unassigned</option>{members.filter((item) => item.id !== member.id).map((item) => <option key={item.id} value={item.id}>{item.fullName}</option>)}</select></Field><Field label="Teams"><select name="teamIds" multiple defaultValue={member.teamIds} className="input min-h-28">{options.teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><div className="flex gap-2 sm:col-span-2"><button disabled={loading} className="rounded-xl bg-sunset px-4 py-2.5 text-xs font-semibold text-white">{loading ? "Saving…" : "Save assignment"}</button><button type="button" onClick={cancel} className="rounded-xl border border-[#444] px-4 py-2.5 text-xs text-[#aaa]">Cancel</button></div></form>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="space-y-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-[#85857f]">{label}</span>{children}</label>; }
