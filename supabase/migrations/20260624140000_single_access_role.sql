with ranked_memberships as (
  select membership.id,
    row_number() over (
      partition by membership.user_id
      order by
        case when admin.user_id is not null and membership.access_type = 'team' then 0 else 1 end,
        case membership.status when 'active' then 0 when 'invited' then 1 else 2 end,
        case membership.access_type when 'team' then 0 when 'agent' then 1 else 2 end,
        membership.created_at
    ) as position
  from public.access_memberships membership
  left join public.platform_admins admin
    on admin.user_id = membership.user_id and admin.active
)
delete from public.access_memberships membership
using ranked_memberships ranked
where membership.id = ranked.id and ranked.position > 1;

create unique index if not exists access_memberships_one_per_user_idx
  on public.access_memberships (user_id);

with ranked_roles as (
  select membership_role.membership_id, membership_role.role_id,
    row_number() over (
      partition by membership_role.membership_id
      order by case when role.key = 'team_admin' then 0 else 1 end,
        membership_role.assigned_at desc
    ) as position
  from public.membership_roles membership_role
  join public.roles role on role.id = membership_role.role_id
)
delete from public.membership_roles membership_role
using ranked_roles ranked
where membership_role.membership_id = ranked.membership_id
  and membership_role.role_id = ranked.role_id
  and ranked.position > 1;

create unique index if not exists membership_roles_one_per_membership_idx
  on public.membership_roles (membership_id);

drop policy if exists membership_roles_insert_manager on public.membership_roles;
drop policy if exists membership_roles_update_manager on public.membership_roles;
drop policy if exists membership_roles_delete_manager on public.membership_roles;
create policy membership_roles_insert_platform_admin on public.membership_roles
  for insert to authenticated with check (public.is_platform_admin());
create policy membership_roles_update_platform_admin on public.membership_roles
  for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy membership_roles_delete_platform_admin on public.membership_roles
  for delete to authenticated using (public.is_platform_admin());

create or replace function public.assign_role_to_member(
  target_membership_id uuid,
  target_role_id uuid,
  target_organization_id uuid
)
returns void language plpgsql security definer set search_path = '' as $$
declare
  current_user_id uuid := (select auth.uid());
  target_access_type public.access_type;
  membership_organization_id uuid;
  role_organization_id uuid;
  role_access_type public.access_type;
begin
  if not public.is_platform_admin() then
    raise exception 'Only the Platform Administrator can change roles.' using errcode = '42501';
  end if;
  select membership.access_type, membership.organization_id
    into target_access_type, membership_organization_id
  from public.access_memberships membership where membership.id = target_membership_id;
  if target_access_type is null then raise exception 'Membership not found.' using errcode = 'P0002'; end if;
  if target_access_type <> 'team' then raise exception 'Roles can only be assigned to Team Access users.' using errcode = '42501'; end if;
  if membership_organization_id <> target_organization_id then raise exception 'Membership organization mismatch.' using errcode = '42501'; end if;

  select role.organization_id, role.access_type into role_organization_id, role_access_type
  from public.roles role where role.id = target_role_id;
  if role_organization_id is null or role_organization_id <> target_organization_id or role_access_type <> 'team' then
    raise exception 'The selected Team role is invalid.' using errcode = '42501';
  end if;

  delete from public.membership_roles where membership_id = target_membership_id;
  insert into public.membership_roles (membership_id, role_id, assigned_by)
  values (target_membership_id, target_role_id, current_user_id);
end;
$$;
grant execute on function public.assign_role_to_member(uuid, uuid, uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  has_invitation boolean := nullif(new.raw_user_meta_data ->> 'invitation_id', '') is not null;
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  ) on conflict (id) do nothing;

  if not has_invitation then
    insert into public.access_memberships (user_id, access_type, status, joined_at)
    values (new.id, 'customer', 'active', now())
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;