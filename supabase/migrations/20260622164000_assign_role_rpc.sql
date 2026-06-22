-- Centralized role assignment endpoint with explicit permission checks.
-- This avoids brittle client-side upsert permission failures.

drop function if exists public.assign_role_to_member(uuid, uuid, uuid);

create or replace function public.assign_role_to_member(
  target_membership_id uuid,
  target_role_id uuid,
  target_organization_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid;
  membership_org_id uuid;
  role_org_id uuid;
begin
  current_user_id := (select auth.uid());

  if current_user_id is null then
    raise exception 'User not authenticated' using errcode = '42501';
  end if;

  select m.organization_id
    into membership_org_id
  from public.access_memberships m
  where m.id = target_membership_id;

  if membership_org_id is null then
    raise exception 'Membership not found' using errcode = 'P0002';
  end if;

  if membership_org_id <> target_organization_id then
    raise exception 'Membership organization mismatch' using errcode = '42501';
  end if;

  select r.organization_id
    into role_org_id
  from public.roles r
  where r.id = target_role_id;

  if role_org_id is null then
    raise exception 'Role not found' using errcode = 'P0002';
  end if;

  if role_org_id <> target_organization_id then
    raise exception 'Role organization mismatch' using errcode = '42501';
  end if;

  if not private.has_permission(target_organization_id, 'roles.manage') then
    raise exception 'You do not have permission to assign roles.' using errcode = '42501';
  end if;

  insert into public.membership_roles (membership_id, role_id, assigned_by)
  values (target_membership_id, target_role_id, current_user_id)
  on conflict (membership_id, role_id)
  do update set assigned_by = excluded.assigned_by, assigned_at = now();
end;
$$;

grant execute on function public.assign_role_to_member(uuid, uuid, uuid) to authenticated;
