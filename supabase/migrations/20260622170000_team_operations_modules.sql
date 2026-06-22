create or replace function public.has_permission(
  target_organization_id uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission(target_organization_id, required_permission);
$$;

grant execute on function public.has_permission(uuid, text) to authenticated;

insert into public.permissions (key, name, description) values
  ('schedules.manage', 'Manage duties and schedules', 'Create duties, assign staff, and manage operational rosters.'),
  ('documents.manage', 'Manage knowledge documents', 'Create, edit, publish, and archive organization knowledge.'),
  ('reports.view', 'View team reports', 'View organization-level operational reports.')
on conflict (key) do update
set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-000000000201', id
from public.permissions
where key in ('schedules.manage', 'documents.manage', 'reports.view')
on conflict do nothing;

create table public.shift_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  start_time time not null,
  end_time time not null,
  location_id uuid references public.locations(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shift_template_id uuid references public.shift_templates(id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location_id uuid references public.locations(id) on delete set null,
  department_id uuid references public.departments(id) on delete set null,
  supervisor_membership_id uuid references public.access_memberships(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index schedules_org_starts_idx on public.schedules (organization_id, starts_at);
create index schedules_department_starts_idx on public.schedules (department_id, starts_at);

create table public.schedule_assignments (
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  membership_id uuid not null references public.access_memberships(id) on delete cascade,
  status text not null default 'assigned' check (status in ('assigned', 'confirmed', 'completed', 'absent')),
  completed_at timestamptz,
  assigned_by uuid not null references auth.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key (schedule_id, membership_id)
);

create index schedule_assignments_member_idx on public.schedule_assignments (membership_id, schedule_id);

create table public.duty_handover_notes (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules(id) on delete cascade,
  author_membership_id uuid not null references public.access_memberships(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index duty_handover_notes_schedule_idx on public.duty_handover_notes (schedule_id, created_at desc);

create trigger shift_templates_updated_at before update on public.shift_templates
  for each row execute function public.set_updated_at();
create trigger schedules_updated_at before update on public.schedules
  for each row execute function public.set_updated_at();

alter table public.shift_templates enable row level security;
alter table public.schedules enable row level security;
alter table public.schedule_assignments enable row level security;
alter table public.duty_handover_notes enable row level security;

create policy shift_templates_select_org on public.shift_templates
  for select to authenticated using (private.is_org_member(organization_id));
create policy shift_templates_manage on public.shift_templates
  for all to authenticated
  using (private.has_permission(organization_id, 'schedules.manage'))
  with check (private.has_permission(organization_id, 'schedules.manage') and created_by = (select auth.uid()));

create policy schedules_select_org on public.schedules
  for select to authenticated using (private.is_org_member(organization_id));
create policy schedules_manage on public.schedules
  for all to authenticated
  using (private.has_permission(organization_id, 'schedules.manage'))
  with check (private.has_permission(organization_id, 'schedules.manage'));

create policy schedule_assignments_select_org on public.schedule_assignments
  for select to authenticated using (
    exists (
      select 1 from public.schedules s
      where s.id = schedule_id and private.is_org_member(s.organization_id)
    )
  );
create policy schedule_assignments_manage on public.schedule_assignments
  for insert to authenticated with check (
    assigned_by = (select auth.uid()) and exists (
      select 1 from public.schedules s
      where s.id = schedule_id and private.has_permission(s.organization_id, 'schedules.manage')
    )
  );
create policy schedule_assignments_delete_manager on public.schedule_assignments
  for delete to authenticated using (
    exists (
      select 1 from public.schedules s
      where s.id = schedule_id and private.has_permission(s.organization_id, 'schedules.manage')
    )
  );
create policy schedule_assignments_update_self_or_manager on public.schedule_assignments
  for update to authenticated using (
    exists (
      select 1 from public.access_memberships m
      join public.schedules s on s.id = schedule_id
      where m.id = membership_id
        and (m.user_id = (select auth.uid()) or private.has_permission(s.organization_id, 'schedules.manage'))
    )
  ) with check (
    exists (
      select 1 from public.access_memberships m
      join public.schedules s on s.id = schedule_id
      where m.id = membership_id
        and (m.user_id = (select auth.uid()) or private.has_permission(s.organization_id, 'schedules.manage'))
    )
  );

create policy handover_notes_select_org on public.duty_handover_notes
  for select to authenticated using (
    exists (
      select 1 from public.schedules s
      where s.id = schedule_id and private.is_org_member(s.organization_id)
    )
  );
create policy handover_notes_insert_assignee on public.duty_handover_notes
  for insert to authenticated with check (
    exists (
      select 1
      from public.access_memberships m
      join public.schedules s on s.id = schedule_id
      where m.id = author_membership_id
        and m.user_id = (select auth.uid())
        and m.organization_id = s.organization_id
        and m.status = 'active'
        and (
          exists (
            select 1 from public.schedule_assignments a
            where a.schedule_id = s.id and a.membership_id = m.id
          )
          or private.has_permission(s.organization_id, 'schedules.manage')
        )
    )
  );

drop policy if exists meeting_attendees_insert_manager on public.meeting_attendees;
drop policy if exists meeting_attendees_delete_manager on public.meeting_attendees;
drop policy if exists meeting_attendees_update_self on public.meeting_attendees;

create policy meeting_attendees_insert_manager on public.meeting_attendees
  for insert to authenticated with check (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and private.has_permission(m.organization_id, 'meetings.manage')
    )
  );
create policy meeting_attendees_delete_manager on public.meeting_attendees
  for delete to authenticated using (
    exists (
      select 1 from public.meetings m
      where m.id = meeting_id and private.has_permission(m.organization_id, 'meetings.manage')
    )
  );
create policy meeting_attendees_update_self on public.meeting_attendees
  for update to authenticated
  using (
    user_id = (select auth.uid()) or exists (
      select 1 from public.meetings m
      where m.id = meeting_id and private.has_permission(m.organization_id, 'meetings.manage')
    )
  )
  with check (
    user_id = (select auth.uid()) or exists (
      select 1 from public.meetings m
      where m.id = meeting_id and private.has_permission(m.organization_id, 'meetings.manage')
    )
  );

drop policy if exists documents_insert_own on public.documents;
drop policy if exists documents_update_own on public.documents;
drop policy if exists documents_select_published on public.documents;
drop policy if exists documents_delete_manager on public.documents;

create policy documents_select_org on public.documents
  for select to authenticated using (
    private.is_org_member(organization_id)
    and (status = 'published' or created_by = (select auth.uid()) or private.has_permission(organization_id, 'documents.manage'))
  );
create policy documents_insert_manager on public.documents
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and private.has_permission(organization_id, 'documents.manage')
  );
create policy documents_update_manager on public.documents
  for update to authenticated
  using (private.has_permission(organization_id, 'documents.manage'))
  with check (private.has_permission(organization_id, 'documents.manage'));
create policy documents_delete_manager on public.documents
  for delete to authenticated using (private.has_permission(organization_id, 'documents.manage'));

-- Harold messages are deliberately restricted to user-originated content until
-- an authenticated server-side AI integration is introduced.
drop policy if exists harold_messages_insert_assistant on public.harold_messages;
create policy harold_messages_insert_user on public.harold_messages
  for insert to authenticated with check (
    role = 'user' and exists (
      select 1 from public.harold_conversations c
      where c.id = conversation_id and c.user_id = (select auth.uid())
    )
  );

create policy harold_conversations_update_own on public.harold_conversations
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
