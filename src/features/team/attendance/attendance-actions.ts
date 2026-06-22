"use server";

import { createClient } from "@/lib/supabase/server";

async function getUserAndGuard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  return { supabase, user };
}

export async function clockIn(organizationId: string, membershipId: string) {
  const { supabase } = await getUserAndGuard();

  const { data: existing, error: existingError } = await supabase
    .from("attendance_entries")
    .select("id")
    .eq("membership_id", membershipId)
    .is("clocked_out_at", null)
    .maybeSingle();

  if (existingError) throw new Error(existingError.message);
  if (existing) {
    return { success: true, alreadyClockedIn: true };
  }

  const { error } = await supabase.from("attendance_entries").insert({
    organization_id: organizationId,
    membership_id: membershipId,
    clocked_in_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  return { success: true };
}

export async function clockOut(organizationId: string, membershipId: string) {
  const { supabase } = await getUserAndGuard();

  const { data: activeEntry, error: activeError } = await supabase
    .from("attendance_entries")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("membership_id", membershipId)
    .is("clocked_out_at", null)
    .maybeSingle();

  if (activeError) throw new Error(activeError.message);
  if (!activeEntry) {
    return { success: true, alreadyClockedOut: true };
  }

  const { error } = await supabase
    .from("attendance_entries")
    .update({ clocked_out_at: new Date().toISOString() })
    .eq("id", activeEntry.id);

  if (error) throw new Error(error.message);
  return { success: true };
}
