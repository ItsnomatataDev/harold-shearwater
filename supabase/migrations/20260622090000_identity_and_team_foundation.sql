create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create type public.access_type as enum ('team', 'agent', 'customer');
create type public.membership_status as enum ('invited', 'active', 'suspended');
create type public.organization_type as enum ('shearwater', 'agency');
create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
create type public.task_status as enum ('open', 'in_progress', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  job_title text,
  timezone text not null default 'Africa/Harare',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_lower_idx on public.profiles (lower(email));

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  type public.organization_type not null,
  timezone text not null default 'Africa/Harare',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text not null,
  timezone text not null default 'Africa/Harare',
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  department_id uuid references public.departments(id) on delete set null,
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.access_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  access_type public.access_type not null,
  status public.membership_status not null default 'invited',
  department_id uuid references public.departments(id) on delete set null,
  primary_location_id uuid references public.locations(id) on delete set null,
  employee_number text,
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (access_type = 'customer' or organization_id is not null)
);

create unique index access_memberships_org_unique on public.access_memberships (user_id, organization_id, access_type) where organization_id is not null;
create unique index access_memberships_customer_unique on public.access_memberships (user_id, access_type) where access_type = 'customer';
create index access_memberships_user_idx on public.access_memberships (user_id, status);
create index access_memberships_org_idx on public.access_memberships (organization_id, status);

create table public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  membership_id uuid not null references public.access_memberships(id) on delete cascade,
  is_lead boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (team_id, membership_id)
);

create table public.permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  access_type public.access_type not null,
  name text not null,
  key text not null,
  description text not null,
  system_role boolean not null default false,
  created_at timestamptz not null default now(),
  unique nulls not distinct (organization_id, access_type, key)
);

create table public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table public.membership_roles (
  membership_id uuid not null references public.access_memberships(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  access_type public.access_type not null,
  role_id uuid references public.roles(id) on delete set null,
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  context text,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz,
  priority public.task_priority not null default 'medium',
  status public.task_status not null default 'open',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tasks_org_due_idx on public.tasks (organization_id, due_at);
create index tasks_assignee_status_idx on public.tasks (assigned_to, status);

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.meeting_attendees (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  response text not null default 'needs_action' check (response in ('needs_action', 'accepted', 'declined', 'tentative')),
  primary key (meeting_id, user_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text not null,
  category text not null default 'Operations',
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.access_memberships(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,
  clocked_in_at timestamptz not null default now(),
  clocked_out_at timestamptz,
  created_at timestamptz not null default now(),
  check (clocked_out_at is null or clocked_out_at >= clocked_in_at)
);

create unique index attendance_open_entry_idx on public.attendance_entries (membership_id) where clocked_out_at is null;

create table public.audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid references public.organizations(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_org_created_idx on public.audit_logs (organization_id, created_at desc);

create or replace function private.is_org_member(target_organization_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.access_memberships m
    where m.user_id = (select auth.uid())
      and m.organization_id = target_organization_id
      and m.status = 'active'
  );
$$;

create or replace function private.has_permission(target_organization_id uuid, required_permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.access_memberships m
    join public.membership_roles mr on mr.membership_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    join public.permissions p on p.id = rp.permission_id
    where m.user_id = (select auth.uid())
      and m.organization_id = target_organization_id
      and m.status = 'active'
      and p.key = required_permission
  );
$$;

create or replace function private.shares_organization(target_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.access_memberships mine
    join public.access_memberships theirs on theirs.organization_id = mine.organization_id
    where mine.user_id = (select auth.uid()) and mine.status = 'active'
      and theirs.user_id = target_user_id and theirs.status = 'active'
  );
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_permission(uuid, text) to authenticated;
grant execute on function private.shares_organization(uuid) to authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  ) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger organizations_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger departments_updated_at before update on public.departments for each row execute function public.set_updated_at();
create trigger teams_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger memberships_updated_at before update on public.access_memberships for each row execute function public.set_updated_at();
create trigger tasks_updated_at before update on public.tasks for each row execute function public.set_updated_at();
create trigger meetings_updated_at before update on public.meetings for each row execute function public.set_updated_at();
create trigger announcements_updated_at before update on public.announcements for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.locations enable row level security;
alter table public.departments enable row level security;
alter table public.teams enable row level security;
alter table public.access_memberships enable row level security;
alter table public.team_members enable row level security;
alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.membership_roles enable row level security;
alter table public.invitations enable row level security;
alter table public.tasks enable row level security;
alter table public.meetings enable row level security;
alter table public.meeting_attendees enable row level security;
alter table public.announcements enable row level security;
alter table public.attendance_entries enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_select on public.profiles for select to authenticated using (id = (select auth.uid()) or private.shares_organization(id));
create policy profiles_update_own on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy organizations_select_member on public.organizations for select to authenticated using (private.is_org_member(id));
create policy locations_select_member on public.locations for select to authenticated using (private.is_org_member(organization_id));
create policy departments_select_member on public.departments for select to authenticated using (private.is_org_member(organization_id));
create policy teams_select_member on public.teams for select to authenticated using (private.is_org_member(organization_id));
create policy memberships_select_self_or_manager on public.access_memberships for select to authenticated using (user_id = (select auth.uid()) or private.has_permission(organization_id, 'members.manage'));
create policy team_members_select_org on public.team_members for select to authenticated using (exists (select 1 from public.teams t where t.id = team_id and private.is_org_member(t.organization_id)));
create policy permissions_select_authenticated on public.permissions for select to authenticated using (true);
create policy roles_select_org on public.roles for select to authenticated using (organization_id is null or private.is_org_member(organization_id));
create policy role_permissions_select_org on public.role_permissions for select to authenticated using (exists (select 1 from public.roles r where r.id = role_id and (r.organization_id is null or private.is_org_member(r.organization_id))));
create policy membership_roles_select_self_or_manager on public.membership_roles for select to authenticated using (exists (select 1 from public.access_memberships m where m.id = membership_id and (m.user_id = (select auth.uid()) or private.has_permission(m.organization_id, 'roles.manage'))));
create policy invitations_select_manager on public.invitations for select to authenticated using (private.has_permission(organization_id, 'members.manage'));

create policy tasks_select_org on public.tasks for select to authenticated using (private.is_org_member(organization_id));
create policy tasks_insert_manager on public.tasks for insert to authenticated with check (private.has_permission(organization_id, 'tasks.manage') and created_by = (select auth.uid()));
create policy tasks_update_assignee_or_manager on public.tasks for update to authenticated using (assigned_to = (select auth.uid()) or private.has_permission(organization_id, 'tasks.manage')) with check (private.is_org_member(organization_id));
create policy meetings_select_org on public.meetings for select to authenticated using (private.is_org_member(organization_id));
create policy meetings_manage on public.meetings for all to authenticated using (private.has_permission(organization_id, 'meetings.manage')) with check (private.has_permission(organization_id, 'meetings.manage'));
create policy meeting_attendees_select on public.meeting_attendees for select to authenticated using (user_id = (select auth.uid()) or exists (select 1 from public.meetings m where m.id = meeting_id and private.is_org_member(m.organization_id)));
create policy announcements_select_org on public.announcements for select to authenticated using (private.is_org_member(organization_id) and published_at <= now() and (expires_at is null or expires_at > now()));
create policy announcements_manage on public.announcements for all to authenticated using (private.has_permission(organization_id, 'announcements.manage')) with check (private.has_permission(organization_id, 'announcements.manage'));
create policy attendance_select_own_or_manager on public.attendance_entries for select to authenticated using (exists (select 1 from public.access_memberships m where m.id = membership_id and (m.user_id = (select auth.uid()) or private.has_permission(m.organization_id, 'attendance.manage'))));
create policy attendance_insert_own on public.attendance_entries for insert to authenticated with check (exists (select 1 from public.access_memberships m where m.id = membership_id and m.user_id = (select auth.uid()) and m.organization_id = organization_id and m.status = 'active'));
create policy attendance_update_own on public.attendance_entries for update to authenticated using (exists (select 1 from public.access_memberships m where m.id = membership_id and m.user_id = (select auth.uid()))) with check (exists (select 1 from public.access_memberships m where m.id = membership_id and m.user_id = (select auth.uid())));
create policy audit_select_admin on public.audit_logs for select to authenticated using (organization_id is not null and private.has_permission(organization_id, 'audit.view'));

insert into public.organizations (id, name, slug, type)
values ('00000000-0000-4000-8000-000000000001', 'Shearwater Victoria Falls', 'shearwater-victoria-falls', 'shearwater')
on conflict (id) do nothing;

insert into public.locations (id, organization_id, name, code, address)
values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'Basecamp HQ', 'BCHQ', 'Victoria Falls, Zimbabwe'),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001', 'Adventure Lodge', 'ALVF', 'Victoria Falls, Zimbabwe')
on conflict (id) do nothing;

insert into public.permissions (key, name, description) values
  ('basecamp.view', 'View Basecamp', 'View the Team Access landing page.'),
  ('members.manage', 'Manage members', 'Invite, activate and suspend organization members.'),
  ('roles.manage', 'Manage roles', 'Assign roles and permissions.'),
  ('tasks.manage', 'Manage tasks', 'Create, assign and update organization tasks.'),
  ('meetings.manage', 'Manage meetings', 'Create and update organization meetings.'),
  ('announcements.manage', 'Manage announcements', 'Publish and update announcements.'),
  ('attendance.manage', 'Manage attendance', 'View and administer staff attendance.'),
  ('audit.view', 'View audit log', 'View organization audit activity.')
on conflict (key) do nothing;

insert into public.roles (id, organization_id, access_type, name, key, description, system_role) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000001', 'team', 'Team Administrator', 'team_admin', 'Full Team Access administration.', true),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000001', 'team', 'Team Member', 'team_member', 'Standard internal Team Access.', true)
on conflict (id) do nothing;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-000000000201', id from public.permissions
on conflict do nothing;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-000000000202', id from public.permissions where key = 'basecamp.view'
on conflict do nothing;
