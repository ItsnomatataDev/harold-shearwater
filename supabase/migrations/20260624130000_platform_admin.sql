create table public.platform_admins (
  email text primary key check (email = lower(email)),
  user_id uuid unique references auth.users(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.platform_admins (email)
values ('mpofu7085@gmail.com')
on conflict (email) do update set active = true;

alter table public.platform_admins enable row level security;
drop policy if exists platform_admins_select_self on public.platform_admins;
create policy platform_admins_select_self on public.platform_admins
  for select to authenticated using (user_id = (select auth.uid()) and active);

create or replace function private.provision_platform_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  admin_record public.platform_admins%rowtype;
  target_organization_id uuid;
  target_role_id uuid;
  target_membership_id uuid;
begin
  select * into admin_record from public.platform_admins
  where email = lower(new.email) and active;
  if not found then return new; end if;

  update public.platform_admins set user_id = new.id where email = lower(new.email);
  select id into target_organization_id from public.organizations
  where type = 'shearwater' and active order by created_at limit 1;
  if target_organization_id is null then return new; end if;

  select id into target_role_id from public.roles
  where organization_id = target_organization_id and access_type = 'team' and key = 'team_admin'
  order by created_at limit 1;
  -- Avoid PL/pgSQL name ambiguity with the local organization variable.
  if target_role_id is null then
    select role.id into target_role_id from public.roles role
    where role.access_type = 'team' and role.key = 'team_admin'
    order by role.system_role desc, role.created_at limit 1;
  end if;

  insert into public.access_memberships (user_id, organization_id, access_type, status, joined_at)
  values (new.id, target_organization_id, 'team', 'active', now())
  on conflict (user_id, organization_id, access_type) where organization_id is not null
  do update set status = 'active', joined_at = coalesce(public.access_memberships.joined_at, now())
  returning id into target_membership_id;

  if target_role_id is not null then
    insert into public.membership_roles (membership_id, role_id, assigned_by)
    values (target_membership_id, target_role_id, new.id)
    on conflict (membership_id, role_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists provision_platform_admin on public.profiles;
create trigger provision_platform_admin
  after insert or update of email on public.profiles
  for each row execute function private.provision_platform_admin();

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.platform_admins admin
    where admin.user_id = (select auth.uid()) and admin.active
  );
$$;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

-- Backfill when the account already exists before this migration. Listing the
-- email in SET intentionally fires the UPDATE OF email provisioning trigger.
update public.profiles set email = email
where lower(email) = 'mpofu7085@gmail.com';
