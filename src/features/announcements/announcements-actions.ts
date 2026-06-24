"use server";

import { revalidatePath } from "next/cache";
import { requireTeamContext } from "@/features/auth/services/auth-context";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const announcementSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  audience: z
    .enum(["everyone", "team", "agents", "managers"])
    .default("everyone"),
  pinned: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  publish_now: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  expires_at: z.string().optional(),
});

export type AnnouncementFormState = { error?: string; success?: boolean };

export async function addAnnouncement(
  _prev: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const ctx = await requireTeamContext();
  if (!ctx) return { error: "Unauthorized" };

  const parsed = announcementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    organization_id: ctx.membership.organizationId!,
    title: parsed.data.title,
    body: parsed.data.body,
    audience: parsed.data.audience,
    pinned: parsed.data.pinned ?? false,
    published_at: parsed.data.publish_now ? new Date().toISOString() : null,
    expires_at: parsed.data.expires_at || null,
    created_by: ctx.context.userId,
  });

  if (error) return { error: error.message };
  revalidatePath("/team/announcements");
  return { success: true };
}

export async function publishAnnouncement(
  announcementId: string,
): Promise<void> {
  const ctx = await requireTeamContext();
  if (!ctx) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ published_at: new Date().toISOString() })
    .eq("id", announcementId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) throw new Error(error.message);
  revalidatePath("/team/announcements");
}

export async function toggleAnnouncementPin(
  announcementId: string,
  pinned: boolean,
): Promise<void> {
  const ctx = await requireTeamContext();
  if (!ctx) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ pinned })
    .eq("id", announcementId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) throw new Error(error.message);
  revalidatePath("/team/announcements");
}

export async function deleteAnnouncement(
  announcementId: string,
): Promise<void> {
  const ctx = await requireTeamContext();
  if (!ctx) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", announcementId)
    .eq("organization_id", ctx.membership.organizationId!);

  if (error) throw new Error(error.message);
  revalidatePath("/team/announcements");
}
