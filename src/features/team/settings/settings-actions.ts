"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireTeamContext } from "@/features/auth/services/auth-context";

const schema = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), phone: z.string().trim().max(40).optional(), jobTitle: z.string().trim().max(120).optional(), timezone: z.string().trim().min(1).max(80), avatarUrl: z.union([z.string().url(), z.literal("")]).optional() });

export async function updateProfile(input: unknown) {
  const parsed = schema.parse(input); const team = await requireTeamContext(); if (!team) throw new Error("Team Access is required.");
  const { error } = await (await createClient()).from("profiles").update({ first_name: parsed.firstName, last_name: parsed.lastName, phone: parsed.phone || null, job_title: parsed.jobTitle || null, timezone: parsed.timezone, avatar_url: parsed.avatarUrl || null }).eq("id", team.context.userId);
  if (error) throw new Error(error.message); revalidatePath("/team/settings"); revalidatePath("/team", "layout");
}
