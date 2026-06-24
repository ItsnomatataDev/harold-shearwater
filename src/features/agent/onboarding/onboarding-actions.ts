"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAgentContext } from "@/features/auth/services/auth-context";
import { z } from "zod";

const onboardingSchema = z.object({
  agencyName: z.string().min(1, "Agency name is required").max(120),
  website: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() ? value.trim() : undefined,
    z.url("Enter a valid URL (e.g. https://youragency.com)").optional(),
  ),
  phone: z
    .string()
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : null)),
});

export async function completeAgentOnboarding(rawInput: unknown) {
  const agent = await requireAgentContext();
  if (!agent) throw new Error("Unauthorized.");

  const parsed = onboardingSchema.parse(rawInput);
  const supabase = await createClient();

  const { error } = await supabase
    .from("profiles")
    .update({
      agency_name: parsed.agencyName,
      website: parsed.website ?? null,
      phone: parsed.phone ?? null,
    })
    .eq("id", agent.context.userId);

  if (error) throw new Error(error.message);

  revalidatePath("/agent", "layout");
}
