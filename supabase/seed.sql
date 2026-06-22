-- Development-only bootstrap after creating a user through Supabase Auth.
-- Replace the placeholder UUID with auth.users.id for the initial Shearwater administrator.
-- Never run this file automatically against production.

-- insert into public.access_memberships (
--   user_id, organization_id, access_type, status, primary_location_id, joined_at
-- ) values (
--   'REPLACE_WITH_AUTH_USER_UUID',
--   '00000000-0000-4000-8000-000000000001',
--   'team', 'active', '00000000-0000-4000-8000-000000000101', now()
-- );

-- insert into public.membership_roles (membership_id, role_id)
-- select id, '00000000-0000-4000-8000-000000000201'
-- from public.access_memberships
-- where user_id = 'REPLACE_WITH_AUTH_USER_UUID' and access_type = 'team';
