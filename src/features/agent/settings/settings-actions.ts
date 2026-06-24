"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/features/auth/services/auth-context";
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

export async function saveAgentSettings(rawInput: unknown) {
  const agent = await requireAgentContext();
  if (!agent) throw new Error("Unauthorized.");

  const parsed = settingsSchema.parse(rawInput);
  const supabase = await createClient();

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

  revalidatePath("/agent", "layout");
}
