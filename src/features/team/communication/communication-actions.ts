"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasOrganizationPermission, requireTeamContext } from "@/features/auth/services/auth-context";

const schema = z.object({ title: z.string().trim().min(2).max(160), body: z.string().trim().min(2).max(5000), category: z.string().trim().min(2).max(60), expiresAt: z.string().datetime().optional() });

export async function publishAnnouncement(organizationId: string, input: unknown) {
  const parsed = schema.parse(input);
  const team = await requireTeamContext();
  if (!team || team.membership.organizationId !== organizationId) throw new Error("Team Access is required.");
  if (!(await hasOrganizationPermission(organizationId, "announcements.manage"))) throw new Error("You do not have permission to publish announcements.");
  const { error } = await (await createClient()).from("announcements").insert({ organization_id: organizationId, title: parsed.title, body: parsed.body, category: parsed.category, created_by: team.context.userId, published_at: new Date().toISOString(), expires_at: parsed.expiresAt || null });
  if (error) throw new Error(error.message);
  revalidatePath("/team/communication");
  revalidatePath("/team/dashboard");
}
