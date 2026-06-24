create or replace function private.is_team_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_memberships m
    where m.user_id = (select auth.uid())
      and m.organization_id = target_organization_id
      and m.access_type = 'team'
      and m.status = 'active'
  );
$$;

create or replace function private.is_agent_member(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_memberships m
    where m.user_id = (select auth.uid())
      and m.organization_id = target_organization_id
      and m.access_type = 'agent'
      and m.status = 'active'
  );
$$;

create or replace function private.is_any_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_memberships m
    where m.user_id = (select auth.uid())
      and m.access_type = 'team'
      and m.status = 'active'
  );
$$;

create or replace function private.owns_agent_membership(
  target_membership_id uuid,
  target_organization_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_memberships m
    where m.id = target_membership_id
      and m.user_id = (select auth.uid())
      and m.organization_id = target_organization_id
      and m.access_type = 'agent'
      and m.status = 'active'
  );
$$;

create or replace function private.is_agent_meeting_participant(
  target_meeting_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.meeting_participants mp
    join public.access_memberships am on am.id = mp.membership_id
    where mp.meeting_id = target_meeting_id
      and am.user_id = (select auth.uid())
      and am.access_type = 'agent'
      and am.status = 'active'
  );
$$;

grant execute on function private.is_team_member(uuid) to authenticated;
grant execute on function private.is_agent_member(uuid) to authenticated;
grant execute on function private.is_any_team_member() to authenticated;
grant execute on function private.owns_agent_membership(uuid, uuid) to authenticated;
grant execute on function private.is_agent_meeting_participant(uuid) to authenticated;

-- Enquiries: Team Access can service the queue; an agent can only access rows
-- owned by their own active agent membership.
drop policy if exists agent_enquiries_select on public.agent_enquiries;
drop policy if exists agent_enquiries_insert on public.agent_enquiries;
drop policy if exists agent_enquiries_update on public.agent_enquiries;
drop policy if exists agent_enquiries_delete on public.agent_enquiries;

create policy agent_enquiries_select on public.agent_enquiries
  for select to authenticated
  using (
    private.is_team_member(organization_id)
    or (
      membership_id is not null
      and private.owns_agent_membership(membership_id, organization_id)
    )
  );

create policy agent_enquiries_insert on public.agent_enquiries
  for insert to authenticated
  with check (
    private.is_team_member(organization_id)
    or (
      membership_id is not null
      and private.owns_agent_membership(membership_id, organization_id)
    )
  );

create policy agent_enquiries_update on public.agent_enquiries
  for update to authenticated
  using (
    private.is_team_member(organization_id)
    or (
      membership_id is not null
      and private.owns_agent_membership(membership_id, organization_id)
    )
  )
  with check (
    private.is_team_member(organization_id)
    or (
      membership_id is not null
      and private.owns_agent_membership(membership_id, organization_id)
    )
  );

create policy agent_enquiries_delete on public.agent_enquiries
  for delete to authenticated
  using (
    private.is_team_member(organization_id)
    or (
      membership_id is not null
      and private.owns_agent_membership(membership_id, organization_id)
    )
  );

-- Existing knowledge documents remain the fact-sheet/media source. Team users
-- see all company documents; agents only see published shared material and
-- files explicitly owned by their own membership.
drop policy if exists documents_select_published on public.documents;
drop policy if exists documents_insert_own on public.documents;
drop policy if exists documents_update_own on public.documents;
drop policy if exists documents_team_select on public.documents;
drop policy if exists documents_agent_select on public.documents;
drop policy if exists documents_insert on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;

create policy documents_select_team_or_agent on public.documents
  for select to authenticated
  using (
    private.is_team_member(organization_id)
    or (
      private.is_agent_member(organization_id)
      and (
        (owner_type = 'team' and status = 'published')
        or (
          owner_type = 'agent'
          and owner_id is not null
          and private.owns_agent_membership(owner_id, organization_id)
        )
      )
    )
  );

create policy documents_insert_team_or_owner_agent on public.documents
  for insert to authenticated
  with check (
    (private.is_team_member(organization_id) and created_by = (select auth.uid()))
    or (
      owner_type = 'agent'
      and owner_id is not null
      and created_by = (select auth.uid())
      and private.owns_agent_membership(owner_id, organization_id)
    )
  );

create policy documents_update_team_or_owner_agent on public.documents
  for update to authenticated
  using (
    private.is_team_member(organization_id)
    or (
      owner_type = 'agent'
      and owner_id is not null
      and private.owns_agent_membership(owner_id, organization_id)
    )
  )
  with check (
    private.is_team_member(organization_id)
    or (
      owner_type = 'agent'
      and owner_id is not null
      and private.owns_agent_membership(owner_id, organization_id)
    )
  );

create policy documents_delete_team_or_owner_agent on public.documents
  for delete to authenticated
  using (
    private.is_team_member(organization_id)
    or (
      owner_type = 'agent'
      and owner_id is not null
      and private.owns_agent_membership(owner_id, organization_id)
    )
  );

-- Published reviews are useful sales content; moderation remains Team-only.
drop policy if exists reviews_team_select on public.reviews;
drop policy if exists reviews_write on public.reviews;

create policy reviews_select on public.reviews
  for select to authenticated
  using (
    private.is_team_member(organization_id)
    or (private.is_agent_member(organization_id) and status = 'published')
  );

create policy reviews_write_team on public.reviews
  for all to authenticated
  using (private.is_team_member(organization_id))
  with check (private.is_team_member(organization_id));

-- Internal Team Access tables must not become visible merely because an agent
-- is linked to the Shearwater supplier organization.
drop policy if exists departments_select_member on public.departments;
create policy departments_select_team on public.departments
  for select to authenticated
  using (private.is_team_member(organization_id));

drop policy if exists teams_select_member on public.teams;
create policy teams_select_team on public.teams
  for select to authenticated
  using (private.is_team_member(organization_id));

drop policy if exists team_members_select_org on public.team_members;
create policy team_members_select_team on public.team_members
  for select to authenticated
  using (exists (
    select 1 from public.teams t
    where t.id = team_id and private.is_team_member(t.organization_id)
  ));

drop policy if exists tasks_select_org on public.tasks;
create policy tasks_select_team on public.tasks
  for select to authenticated
  using (private.is_team_member(organization_id));

drop policy if exists roles_select_org on public.roles;
create policy roles_select_team on public.roles
  for select to authenticated
  using (
    (organization_id is null and private.is_any_team_member())
    or (organization_id is not null and private.is_team_member(organization_id))
  );

drop policy if exists memberships_select_rate_agents on public.access_memberships;
create policy memberships_select_rate_agents on public.access_memberships
  for select to authenticated
  using (
    access_type = 'agent'
    and organization_id is not null
    and private.has_permission(organization_id, 'rates.manage')
  );

drop policy if exists role_permissions_select_org on public.role_permissions;
create policy role_permissions_select_team on public.role_permissions
  for select to authenticated
  using (exists (
    select 1 from public.roles r
    where r.id = role_id
      and (
        (r.organization_id is null and private.is_any_team_member())
        or (r.organization_id is not null and private.is_team_member(r.organization_id))
      )
  ));

drop policy if exists meetings_select_org on public.meetings;
drop policy if exists meetings_select on public.meetings;
create policy meetings_select_team_or_invited_agent on public.meetings
  for select to authenticated
  using (
    private.is_team_member(organization_id)
    or (
      private.is_agent_member(organization_id)
      and meeting_type = 'agent'
      and private.is_agent_meeting_participant(id)
    )
  );

drop policy if exists announcements_select_org on public.announcements;
drop policy if exists announcements_select on public.announcements;
create policy announcements_select_by_audience on public.announcements
  for select to authenticated
  using (
    published_at is not null
    and published_at <= now()
    and (expires_at is null or expires_at > now())
    and (
      private.is_team_member(organization_id)
      or (
        private.is_agent_member(organization_id)
        and audience in ('everyone', 'agents')
      )
    )
  );

-- New Team and Agent identities require approval. Existing active accounts are
-- intentionally preserved so this migration does not lock out current users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  portal_access text := lower(coalesce(new.raw_user_meta_data ->> 'portal_access', 'customer'));
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  )
  on conflict (id) do nothing;

  if portal_access in ('team', 'agent') then
    insert into public.access_memberships (
      user_id,
      organization_id,
      access_type,
      status,
      joined_at
    )
    values (
      new.id,
      '00000000-0000-4000-8000-000000000001',
      portal_access::public.access_type,
      'invited',
      null
    )
    on conflict do nothing;
  else
    insert into public.access_memberships (
      user_id,
      access_type,
      status,
      joined_at
    )
    values (new.id, 'customer', 'active', now())
    on conflict do nothing;
  end if;

  return new;
end;
$$;
