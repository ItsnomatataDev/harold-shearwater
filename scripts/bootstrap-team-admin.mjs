import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!email)
  throw new Error("Usage: npm run bootstrap:admin -- you@example.com");
if (!url || !secretKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and a server-only admin key (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY) must be set in .env.",
  );
}

const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: usersData, error: usersError } =
  await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw usersError;
const user = usersData.users.find(
  (candidate) => candidate.email?.toLowerCase() === email,
);
if (!user)
  throw new Error(
    `No confirmed Auth user found for ${email}. Create the account through /auth first.`,
  );

const organizationId = "00000000-0000-4000-8000-000000000001";
const adminRoleId = "00000000-0000-4000-8000-000000000201";
const basecampLocationId = "00000000-0000-4000-8000-000000000101";
const { data: existing, error: existingError } = await supabase
  .from("access_memberships")
  .select("id")
  .eq("user_id", user.id)
  .eq("organization_id", organizationId)
  .eq("access_type", "team")
  .maybeSingle();
if (existingError) throw existingError;

let membershipId = existing?.id;
if (membershipId) {
  const { error } = await supabase
    .from("access_memberships")
    .update({
      status: "active",
      primary_location_id: basecampLocationId,
      joined_at: new Date().toISOString(),
    })
    .eq("id", membershipId);
  if (error) throw error;
} else {
  const { data, error } = await supabase
    .from("access_memberships")
    .insert({
      user_id: user.id,
      organization_id: organizationId,
      access_type: "team",
      status: "active",
      primary_location_id: basecampLocationId,
      joined_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  membershipId = data.id;
}

const { error: roleError } = await supabase
  .from("membership_roles")
  .upsert(
    { membership_id: membershipId, role_id: adminRoleId, assigned_by: user.id },
    { onConflict: "membership_id,role_id" },
  );
if (roleError) throw roleError;
const { error: auditError } = await supabase
  .from("audit_logs")
  .insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    action: "workspace.bootstrap_admin",
    entity_type: "access_membership",
    entity_id: membershipId,
    metadata: { email },
  });
if (auditError) throw auditError;
console.log(`Team Administrator access is active for ${email}.`);
