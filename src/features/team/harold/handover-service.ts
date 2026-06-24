import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  HaroldConversationStatus,
  HaroldMessage,
  HaroldMessageRole,
} from "./harold-service";

export interface HandoverConversation {
  id: string;
  title: string;
  status: Exclude<HaroldConversationStatus, "ai_active">;
  requesterName: string;
  requesterEmail: string;
  sourceAccess: "team" | "agent" | "customer";
  handoverReason: string | null;
  handoverRequestedAt: string | null;
  assignedToMembershipId: string | null;
  assignedToName: string | null;
  resolvedAt: string | null;
  chatConversationId: string | null;
  updatedAt: string;
  messages: HaroldMessage[];
}

export async function getHandoverQueue(
  organizationId: string,
): Promise<HandoverConversation[]> {
  const supabase = await createClient();
  const { data: conversations, error } = await supabase
    .from("harold_conversations")
    .select(
      "id,title,status,user_id,source_access,handover_reason,handover_requested_at,assigned_to_membership_id,resolved_at,chat_conversation_id,updated_at",
    )
    .eq("organization_id", organizationId)
    .neq("status", "ai_active")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const conversationIds = (conversations ?? []).map((item) => item.id);
  const userIds = Array.from(
    new Set((conversations ?? []).map((item) => item.user_id)),
  );
  const assignedMembershipIds = Array.from(
    new Set(
      (conversations ?? [])
        .map((item) => item.assigned_to_membership_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const [messages, requesterProfiles, assignedMemberships] = await Promise.all([
    conversationIds.length
      ? supabase
          .from("harold_messages")
          .select("id,conversation_id,role,content,author_user_id,created_at")
          .in("conversation_id", conversationIds)
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
    userIds.length
      ? supabase
          .from("profiles")
          .select("id,first_name,last_name,email")
          .in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    assignedMembershipIds.length
      ? supabase
          .from("access_memberships")
          .select("id,user_id")
          .in("id", assignedMembershipIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const result of [messages, requesterProfiles, assignedMemberships]) {
    if (result.error) throw new Error(result.error.message);
  }

  const messageAuthorIds = Array.from(
    new Set(
      (messages.data ?? [])
        .map((message) => message.author_user_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const assignedUserIds = (assignedMemberships.data ?? []).map(
    (item) => item.user_id,
  );
  const staffIds = Array.from(new Set([...messageAuthorIds, ...assignedUserIds]));
  const staffProfiles = staffIds.length
    ? await supabase
        .from("profiles")
        .select("id,first_name,last_name,email")
        .in("id", staffIds)
    : { data: [], error: null };
  if (staffProfiles.error) throw new Error(staffProfiles.error.message);

  const profileName = (profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  }) =>
    `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
    profile.email;
  const requesterMap = new Map(
    (requesterProfiles.data ?? []).map((profile) => [profile.id, profile]),
  );
  const staffNameMap = new Map(
    (staffProfiles.data ?? []).map((profile) => [profile.id, profileName(profile)]),
  );
  const assignedMembershipMap = new Map(
    (assignedMemberships.data ?? []).map((membership) => [
      membership.id,
      membership.user_id,
    ]),
  );

  return (conversations ?? []).map((conversation) => {
    const requester = requesterMap.get(conversation.user_id);
    const assignedUserId = conversation.assigned_to_membership_id
      ? assignedMembershipMap.get(conversation.assigned_to_membership_id)
      : null;
    return {
      id: conversation.id,
      title: conversation.title,
      status: conversation.status as HandoverConversation["status"],
      requesterName: requester ? profileName(requester) : "Team member",
      requesterEmail: requester?.email ?? "",
      sourceAccess: conversation.source_access,
      handoverReason: conversation.handover_reason,
      handoverRequestedAt: conversation.handover_requested_at,
      assignedToMembershipId: conversation.assigned_to_membership_id,
      assignedToName: assignedUserId
        ? staffNameMap.get(assignedUserId) ?? "Shearwater Team"
        : null,
      resolvedAt: conversation.resolved_at,
      chatConversationId: conversation.chat_conversation_id,
      updatedAt: conversation.updated_at,
      messages: (messages.data ?? [])
        .filter((message) => message.conversation_id === conversation.id)
        .map((message) => ({
          id: message.id,
          conversationId: message.conversation_id,
          role: message.role as HaroldMessageRole,
          content: message.content,
          authorName:
            message.role === "assistant"
              ? "Harold"
              : message.role === "human"
                ? staffNameMap.get(message.author_user_id ?? "") ??
                  "Shearwater Team"
                : message.role === "system"
                  ? "System"
                  : requester
                    ? profileName(requester)
                    : "Requester",
          createdAt: message.created_at,
        })),
    };
  });
}
