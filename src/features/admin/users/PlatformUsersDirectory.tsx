"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PlatformUser, TeamMemberOption } from "./platform-users-service";
import { approveAgentMembership } from "./platform-users-actions";
import { assignKeyAccountAssistant } from "@/features/team/key-accounts/key-account-actions";

type Filter = "all" | "team" | "agent" | "customer";

export function PlatformUsersDirectory({
  users,
  teamMembers,
}: {
  users: PlatformUser[];
  teamMembers: TeamMemberOption[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(
    () =>
      users.filter(
        (user) =>
          (filter === "all" || user.accessType === filter) &&
          `${user.name} ${user.email} ${user.organization}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [filter, search, users],
  );

  const counts = {
    all: users.length,
    team: users.filter((user) => user.accessType === "team").length,
    agent: users.filter((user) => user.accessType === "agent").length,
    customer: users.filter((user) => user.accessType === "customer").length,
  };

  function handleApproveAgent(membershipId: string) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await approveAgentMembership(membershipId);
        setMessage(
          result.alreadyActive
            ? "Agent access is already active."
            : "Agent access approved. They can now sign in to the Agent portal.",
        );
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Unable to approve agent.",
        );
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {(["all", "team", "agent", "customer"] as Filter[]).map((item) => (
          <button
            key={item}
            onClick={() => setFilter(item)}
            className={`rounded-2xl border p-4 text-left ${
              filter === item
                ? "border-gold/40 bg-gold/8"
                : "border-[#343431] bg-[#1d1d1b]"
            }`}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#777]">
              {item === "all" ? "All users" : item}
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {counts[item]}
            </p>
          </button>
        ))}
      </div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search by name, email or organization"
        className="input w-full"
      />

      {message ? (
        <div className="rounded-xl border border-savannah/30 bg-savannah/10 px-4 py-3 text-xs text-[#84d4b0]">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-sunset/30 bg-sunset/10 px-4 py-3 text-xs text-[#f18a77]">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[#343431] bg-[#1d1d1b]">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[#343431] text-[10px] uppercase tracking-wider text-[#777]">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Access</th>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Key account</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr
                  key={user.membershipId}
                  className="border-b border-[#30302d] last:border-0"
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-white">
                      {user.name}
                    </p>
                    <p className="mt-1 text-[10px] text-[#777]">{user.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-victoria/10 px-2.5 py-1 text-[10px] font-semibold capitalize text-victoria">
                      {user.accessType}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-[#aaa]">
                    {user.organization}
                  </td>
                  <td className="px-5 py-4 text-xs text-[#aaa]">
                    {user.roles.join(", ") || "Standard user"}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-semibold capitalize ${
                        user.status === "active"
                          ? "text-savannah"
                          : user.status === "suspended"
                            ? "text-sunset"
                            : "text-gold"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {user.status === "active" &&
                    (user.accessType === "agent" || user.accessType === "customer") ? (
                      <KeyAccountAssignCell
                        user={user}
                        teamMembers={teamMembers}
                        disabled={pending}
                        onAssigned={() => {
                          setMessage("Key account assistant assigned.");
                          router.refresh();
                        }}
                        onError={(text) => setError(text)}
                      />
                    ) : (
                      <span className="text-[10px] text-[#555]">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {user.accessType === "agent" && user.status === "invited" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => handleApproveAgent(user.membershipId)}
                        className="rounded-lg border border-gold/30 px-3 py-1.5 text-[10px] font-semibold text-gold transition hover:bg-gold/10 disabled:opacity-60"
                      >
                        Approve Agent
                      </button>
                    ) : (
                      <span className="text-[10px] text-[#555]">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="p-10 text-center text-xs text-[#777]">
            No users match this view.
          </p>
        )}
      </div>
    </div>
  );
}

function KeyAccountAssignCell({
  user,
  teamMembers,
  disabled,
  onAssigned,
  onError,
}: {
  user: PlatformUser;
  teamMembers: TeamMemberOption[];
  disabled: boolean;
  onAssigned: () => void;
  onError: (message: string) => void;
}) {
  const [teamMembershipId, setTeamMembershipId] = useState(
    user.keyAccountTeamMembershipId ?? "",
  );
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex min-w-48 flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (!teamMembershipId) return;
        startTransition(async () => {
          try {
            await assignKeyAccountAssistant({
              partnerMembershipId: user.membershipId,
              teamMembershipId,
            });
            onAssigned();
          } catch (cause) {
            onError(
              cause instanceof Error
                ? cause.message
                : "Unable to assign key account assistant.",
            );
          }
        });
      }}
    >
      <select
        value={teamMembershipId}
        onChange={(event) => setTeamMembershipId(event.target.value)}
        className="rounded-lg border border-[#3a3a36] bg-[#232321] px-2 py-1.5 text-[10px] text-white"
      >
        <option value="">Choose assistant</option>
        {teamMembers.map((member) => (
          <option key={member.membershipId} value={member.membershipId}>
            {member.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={disabled || pending || !teamMembershipId}
        className="rounded-lg border border-victoria/30 px-2 py-1 text-[10px] font-semibold text-victoria disabled:opacity-50"
      >
        {user.keyAccountAssistantName ? "Update" : "Assign"}
      </button>
      {user.keyAccountAssistantName ? (
        <p className="text-[9px] text-[#666]">
          Current: {user.keyAccountAssistantName}
        </p>
      ) : null}
    </form>
  );
}
