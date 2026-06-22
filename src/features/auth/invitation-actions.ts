"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export async function acceptTeamInvitation(rawToken: string) {
  const token = z.string().length(64).regex(/^[a-f0-9]+$/).parse(rawToken);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/auth/accept-invitation?token=${token}`)}`);
  const { error } = await supabase.rpc("accept_team_invitation", { raw_token: token });
  if (error) throw new Error(error.message);
  redirect("/team/dashboard");
}
