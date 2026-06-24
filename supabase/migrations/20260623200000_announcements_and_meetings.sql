insert into public.permissions (key, name, description)
values
  ('announcements.manage', 'Manage announcements', 'Create, edit, pin and publish team announcements.'),
  ('meetings.manage', 'Manage meetings', 'Create, edit and manage team meetings, notes and action items.')
on conflict (key) do update
set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-000000000201', id
from public.permissions
where key in ('announcements.manage', 'meetings.manage')
on conflict do nothing;

alter table public.announcements
  add column if not exists audience text not null default 'everyone',
  add column if not exists pinned boolean not null default false;

alter table public.announcements
  alter column published_at drop not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'announcements_audience_check'
  ) then
    alter table public.announcements
      add constraint announcements_audience_check
      check (audience in ('everyone', 'team', 'agents', 'managers'));
  end if;
end $$;

create index if not exists announcements_org_pinned_idx
  on public.announcements (organization_id, pinned)
  where pinned = true;

alter table public.meetings
  add column if not exists meeting_type text not null default 'internal',
  add column if not exists status text not null default 'scheduled',
  add column if not exists scheduled_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists location_notes text,
  add column if not exists notes text,
  add column if not exists notes_approved boolean not null default false;

update public.meetings
set
  scheduled_at = coalesce(scheduled_at, starts_at),
  ended_at = coalesce(ended_at, ends_at),
  location_notes = coalesce(location_notes, location)
where scheduled_at is null
   or (ended_at is null and ends_at is not null)
   or (location_notes is null and location is not null);

alter table public.meetings
  alter column scheduled_at set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meetings_type_check'
  ) then
    alter table public.meetings
      add constraint meetings_type_check
      check (meeting_type in ('internal', 'briefing', 'debrief', 'client', 'agent', 'other'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'meetings_status_check'
  ) then
    alter table public.meetings
      add constraint meetings_status_check
      check (status in ('scheduled', 'in_progress', 'completed', 'cancelled'));
  end if;
end $$;

create index if not exists meetings_org_scheduled_idx
  on public.meetings (organization_id, scheduled_at desc);
create index if not exists meetings_org_status_idx
  on public.meetings (organization_id, status);

create table if not exists public.meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  membership_id uuid not null references public.access_memberships(id) on delete cascade,
  role text not null default 'attendee' check (role in ('host', 'attendee', 'optional')),
  attended boolean,
  created_at timestamptz not null default now(),
  unique (meeting_id, membership_id)
);

create table if not exists public.meeting_actions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.access_memberships(id) on delete set null,
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meeting_participants_meeting_idx
  on public.meeting_participants (meeting_id);
create index if not exists meeting_participants_member_idx
  on public.meeting_participants (membership_id);
create index if not exists meeting_actions_meeting_idx
  on public.meeting_actions (meeting_id);
create index if not exists meeting_actions_assignee_idx
  on public.meeting_actions (assignee_id, status);

drop trigger if exists meeting_actions_updated_at on public.meeting_actions;
create trigger meeting_actions_updated_at
  before update on public.meeting_actions
  for each row execute function public.set_updated_at();

alter table public.meeting_participants enable row level security;
alter table public.meeting_actions enable row level security;

drop policy if exists meeting_participants_select on public.meeting_participants;
create policy meeting_participants_select on public.meeting_participants
  for select to authenticated
  using (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and private.is_org_member(m.organization_id)
  ));

drop policy if exists meeting_participants_write on public.meeting_participants;
create policy meeting_participants_write on public.meeting_participants
  for all to authenticated
  using (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and private.has_permission(m.organization_id, 'meetings.manage')
  ))
  with check (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and private.has_permission(m.organization_id, 'meetings.manage')
  ));

drop policy if exists meeting_actions_select on public.meeting_actions;
create policy meeting_actions_select on public.meeting_actions
  for select to authenticated
  using (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and private.is_org_member(m.organization_id)
  ));

drop policy if exists meeting_actions_write on public.meeting_actions;
create policy meeting_actions_write on public.meeting_actions
  for all to authenticated
  using (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and private.has_permission(m.organization_id, 'meetings.manage')
  ))
  with check (exists (
    select 1 from public.meetings m
    where m.id = meeting_id and private.has_permission(m.organization_id, 'meetings.manage')
  ));
