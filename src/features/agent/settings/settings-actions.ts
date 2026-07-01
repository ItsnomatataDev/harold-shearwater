"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import {
  getAgentGoldenDuskProfileView,
  refreshAgentGoldenDuskProfileView,
} from "@/features/agent/profile/agent-display-profile";
import { z } from "zod";

const settingsSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  phone: z
    .string()
    .optional()
    .transform((v) => v?.trim() || null),
  agencyName: z.string().min(1, "Agency name is required").max(120),
  website: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() ? value.trim() : undefined,
    z.url("Enter a valid URL including https://").optional(),
  ),
});

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

async function notifyTeamOfAgentProfileChange(input: {
  organizationId: string;
  agentUserId: string;
  agentName: string;
  changes: string[];
}) {
  if (!input.changes.length) return;

  const admin = createAdminClient();
  const { data: teamMemberships, error } = await admin
    .from("access_memberships")
    .select("user_id")
    .eq("organization_id", input.organizationId)
    .eq("access_type", "team")
    .eq("status", "active");

  if (error) throw new Error(error.message);

  const recipients = Array.from(
    new Set(
      (teamMemberships ?? [])
        .map((row) => row.user_id)
        .filter((userId) => userId && userId !== input.agentUserId),
    ),
  );

  if (!recipients.length) return;

  const body = `${input.agentName} updated portal profile details that differ from SWAIBMS: ${input.changes.join("; ")}. Review in Admin → Users if the booking record should be updated too.`;
  const dedupeKey = `agent-profile:${input.agentUserId}:${input.changes.join("|")}`;

  await admin.from("notifications").upsert(
    recipients.map((recipientUserId) => ({
      organization_id: input.organizationId,
      recipient_user_id: recipientUserId,
      category: "access",
      title: "Agent profile update",
      body,
      href: "/admin/users",
      entity_type: "agent_profile",
      entity_id: input.agentUserId,
      dedupe_key: dedupeKey,
      metadata: { changes: input.changes },
    })),
    { onConflict: "recipient_user_id,dedupe_key", ignoreDuplicates: true },
  );
}

export async function refreshAgentGoldenDuskProfileAction() {
  const agent = await requireAgentContext();
  if (!agent?.membership.id) throw new Error("Unauthorized.");

  const profile = await refreshAgentGoldenDuskProfileView(agent.membership.id);
  revalidatePath("/agent", "layout");
  revalidatePath("/agent/settings");
  return profile;
}

export async function saveAgentSettings(rawInput: unknown) {
  const agent = await requireAgentContext();
  if (!agent?.membership.organizationId) throw new Error("Unauthorized.");

  const parsed = settingsSchema.parse(rawInput);
  const supabase = await createClient();
  const goldenDusk = await getAgentGoldenDuskProfileView(agent.membership.id);

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.firstName,
      last_name: parsed.lastName,
      phone: parsed.phone ?? null,
      agency_name: parsed.agencyName,
      website: parsed.website ?? null,
    })
    .eq("id", agent.context.userId);

  if (error) throw new Error(error.message);

  const submittedName = `${parsed.firstName} ${parsed.lastName}`.trim();
  const changes: string[] = [];

  if (
    goldenDusk?.fullName &&
    normalize(submittedName) !== normalize(goldenDusk.fullName)
  ) {
    changes.push(`name "${submittedName}" (SWAIBMS: "${goldenDusk.fullName}")`);
  }
  if (
    goldenDusk?.agencyName &&
    normalize(parsed.agencyName) !== normalize(goldenDusk.agencyName)
  ) {
    changes.push(
      `agency "${parsed.agencyName}" (SWAIBMS: "${goldenDusk.agencyName}")`,
    );
  }

  if (changes.length) {
    await notifyTeamOfAgentProfileChange({
      organizationId: agent.membership.organizationId,
      agentUserId: agent.context.userId,
      agentName: submittedName || agent.context.fullName,
      changes,
    });
  }

  revalidatePath("/agent", "layout");
  revalidatePath("/agent/settings");
}
