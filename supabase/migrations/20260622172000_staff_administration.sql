insert into public.permissions (key, name, description) values
  ('organization.manage', 'Manage organization structure', 'Create and update departments, teams, locations, and staff assignments.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-000000000201', id
from public.permissions
where key = 'organization.manage'
on conflict do nothing;

alter table public.access_memberships
  add column if not exists manager_membership_id uuid references public.access_memberships(id) on delete set null;

create index if not exists access_memberships_manager_idx
  on public.access_memberships (manager_membership_id);

create unique index if not exists invitations_pending_email_idx
  on public.invitations (organization_id, lower(email), access_type)
  where accepted_at is null;

drop policy if exists departments_insert_manager on public.departments;
drop policy if exists departments_update_manager on public.departments;
drop policy if exists departments_delete_manager on public.departments;
create policy departments_insert_manager on public.departments for insert to authenticated
  with check (private.has_permission(organization_id, 'organization.manage'));
create policy departments_update_manager on public.departments for update to authenticated
  using (private.has_permission(organization_id, 'organization.manage'))
  with check (private.has_permission(organization_id, 'organization.manage'));
create policy departments_delete_manager on public.departments for delete to authenticated
  using (private.has_permission(organization_id, 'organization.manage'));

drop policy if exists locations_insert_manager on public.locations;
drop policy if exists locations_update_manager on public.locations;
drop policy if exists locations_delete_manager on public.locations;
create policy locations_insert_manager on public.locations for insert to authenticated
  with check (private.has_permission(organization_id, 'organization.manage'));
create policy locations_update_manager on public.locations for update to authenticated
  using (private.has_permission(organization_id, 'organization.manage'))
  with check (private.has_permission(organization_id, 'organization.manage'));
create policy locations_delete_manager on public.locations for delete to authenticated
  using (private.has_permission(organization_id, 'organization.manage'));

drop policy if exists teams_insert_manager on public.teams;
drop policy if exists teams_update_manager on public.teams;
drop policy if exists teams_delete_manager on public.teams;
create policy teams_insert_manager on public.teams for insert to authenticated
  with check (private.has_permission(organization_id, 'organization.manage'));
create policy teams_update_manager on public.teams for update to authenticated
  using (private.has_permission(organization_id, 'organization.manage'))
  with check (private.has_permission(organization_id, 'organization.manage'));
create policy teams_delete_manager on public.teams for delete to authenticated
  using (private.has_permission(organization_id, 'organization.manage'));

drop policy if exists team_members_insert_manager on public.team_members;
drop policy if exists team_members_update_manager on public.team_members;
drop policy if exists team_members_delete_manager on public.team_members;
create policy team_members_insert_manager on public.team_members for insert to authenticated
  with check (exists (
    select 1 from public.teams t where t.id = team_id
      and private.has_permission(t.organization_id, 'organization.manage')
  ));
create policy team_members_update_manager on public.team_members for update to authenticated
  using (exists (
    select 1 from public.teams t where t.id = team_id
      and private.has_permission(t.organization_id, 'organization.manage')
  )) with check (exists (
    select 1 from public.teams t where t.id = team_id
      and private.has_permission(t.organization_id, 'organization.manage')
  ));
create policy team_members_delete_manager on public.team_members for delete to authenticated
  using (exists (
    select 1 from public.teams t where t.id = team_id
      and private.has_permission(t.organization_id, 'organization.manage')
  ));

drop policy if exists profiles_update_manager on public.profiles;
create policy profiles_update_manager on public.profiles for update to authenticated
  using (exists (
    select 1 from public.access_memberships target
    where target.user_id = profiles.id
      and private.has_permission(target.organization_id, 'members.manage')
  ))
  with check (exists (
    select 1 from public.access_memberships target
    where target.user_id = profiles.id
      and private.has_permission(target.organization_id, 'members.manage')
  ));

drop policy if exists invitations_delete_manager on public.invitations;
create policy invitations_delete_manager on public.invitations for delete to authenticated
  using (private.has_permission(organization_id, 'members.manage'));

create or replace function public.accept_team_invitation(raw_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_row public.invitations%rowtype;
  current_user_id uuid := (select auth.uid());
  current_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  accepted_membership_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into invitation_row
  from public.invitations i
  where i.token_hash = encode(extensions.digest(raw_token, 'sha256'), 'hex')
    and i.access_type = 'team'
    and i.accepted_at is null
    and i.expires_at > now()
  for update;

  if invitation_row.id is null then
    raise exception 'This invitation is invalid or has expired.' using errcode = 'P0002';
  end if;

  if lower(invitation_row.email) <> current_email then
    raise exception 'Sign in with the email address that was invited.' using errcode = '42501';
  end if;

  insert into public.access_memberships (
    user_id, organization_id, access_type, status, invited_by, joined_at
  ) values (
    current_user_id, invitation_row.organization_id, 'team', 'active', invitation_row.invited_by, now()
  )
  on conflict (user_id, organization_id, access_type) where organization_id is not null
  do update set status = 'active', invited_by = excluded.invited_by,
    joined_at = coalesce(public.access_memberships.joined_at, now()), updated_at = now()
  returning id into accepted_membership_id;

  if invitation_row.role_id is not null then
    insert into public.membership_roles (membership_id, role_id, assigned_by)
    values (accepted_membership_id, invitation_row.role_id, invitation_row.invited_by)
    on conflict do nothing;
  end if;

  update public.invitations set accepted_at = now() where id = invitation_row.id;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    invitation_row.organization_id, current_user_id, 'invitation.accepted',
    'access_memberships', accepted_membership_id::text,
    jsonb_build_object('invitationId', invitation_row.id)
  );

  return accepted_membership_id;
end;
$$;

revoke all on function public.accept_team_invitation(text) from public;
revoke all on function public.accept_team_invitation(text) from anon;
grant execute on function public.accept_team_invitation(text) to authenticated;
