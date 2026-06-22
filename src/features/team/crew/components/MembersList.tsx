"use client";

import { useState } from "react";
import { Icon } from "@/components/Icon";
import type { TeamMember, Role } from "../crew-service";
import {
  assignRoleToMember,
  suspendMember,
  activateMember,
} from "../crew-actions";

export function MembersList({
  members,
  roles,
  organizationId,
  userOrgId,
}: {
  members: TeamMember[];
  roles: Role[];
  organizationId: string;
  userOrgId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = organizationId === userOrgId;

  async function handleAction(
    action: "suspend" | "activate" | "assign",
    membershipId: string,
    roleId?: string,
  ) {
    if (!isAdmin) {
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
      window.location.reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  const active = members.filter((m) => m.status === "active");
  const invited = members.filter((m) => m.status === "invited");
  const suspended = members.filter((m) => m.status === "suspended");

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </div>
      )}

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
                {isAdmin && (
                  <div className="ml-4 flex gap-2">
                    <select
                      disabled={loading}
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
              Pending Invitations ({invited.length})
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
                    Invited {new Date(member.invitedBy!).toLocaleDateString()}
                  </p>
                </div>
                {isAdmin && (
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
                {isAdmin && (
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
