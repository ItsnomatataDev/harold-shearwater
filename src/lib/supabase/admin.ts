import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { getSupabaseConfig } from "./config";

export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Supabase server secret is not configured.");
  return createClient<Database>(getSupabaseConfig().url, secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
