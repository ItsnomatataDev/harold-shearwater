create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('meeting', 'schedule', 'announcement', 'knowledge', 'access', 'attendance', 'system')),
  title text not null,
  body text not null,
  href text,
  entity_type text,
  entity_id text,
  dedupe_key text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);
create index notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;
create unique index notifications_recipient_dedupe_idx
  on public.notifications (recipient_user_id, dedupe_key)
  where dedupe_key is not null;

create table public.notification_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  meetings_enabled boolean not null default true,
  schedules_enabled boolean not null default true,
  announcements_enabled boolean not null default true,
  knowledge_enabled boolean not null default true,
  access_enabled boolean not null default true,
  attendance_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, organization_id)
);

create trigger notification_preferences_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications
  for delete to authenticated
  using (recipient_user_id = (select auth.uid()));

create policy notification_preferences_select_own on public.notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_preferences_insert_own on public.notification_preferences
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_org_member(organization_id)
  );
create policy notification_preferences_update_own on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and private.is_org_member(organization_id)
  );

create or replace function private.notification_enabled(
  target_user_id uuid,
  target_organization_id uuid,
  target_category text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.in_app_enabled and case target_category
      when 'meeting' then p.meetings_enabled
      when 'schedule' then p.schedules_enabled
      when 'announcement' then p.announcements_enabled
      when 'knowledge' then p.knowledge_enabled
      when 'access' then p.access_enabled
      when 'attendance' then p.attendance_enabled
      else true
    end
    from public.notification_preferences p
    where p.user_id = target_user_id
      and p.organization_id = target_organization_id
  ), true);
$$;

create or replace function private.push_notification(
  target_user_id uuid,
  target_organization_id uuid,
  target_category text,
  notification_title text,
  notification_body text,
  notification_href text default null,
  target_entity_type text default null,
  target_entity_id text default null,
  target_dedupe_key text default null,
  notification_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null or target_organization_id is null then
    return;
  end if;

  if not private.notification_enabled(target_user_id, target_organization_id, target_category) then
    return;
  end if;

  insert into public.notifications (
    organization_id, recipient_user_id, category, title, body, href,
    entity_type, entity_id, dedupe_key, metadata
  ) values (
    target_organization_id, target_user_id, target_category,
    notification_title, notification_body, notification_href,
    target_entity_type, target_entity_id, target_dedupe_key,
    coalesce(notification_metadata, '{}'::jsonb)
  )
  on conflict (recipient_user_id, dedupe_key)
    where dedupe_key is not null
  do nothing;
end;
$$;

revoke all on function private.notification_enabled(uuid, uuid, text) from public;
revoke all on function private.push_notification(uuid, uuid, text, text, text, text, text, text, text, jsonb) from public;

create or replace function private.notify_meeting_attendee_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meeting_row public.meetings%rowtype;
begin
  select * into meeting_row from public.meetings where id = new.meeting_id;
  if new.user_id <> meeting_row.created_by then
    perform private.push_notification(
      new.user_id, meeting_row.organization_id, 'meeting',
      'Meeting invitation',
      meeting_row.title || ' · ' || to_char(meeting_row.starts_at at time zone 'Africa/Harare', 'Dy DD Mon, HH24:MI'),
      '/team/meetings', 'meetings', meeting_row.id::text,
      'meeting-invite:' || meeting_row.id::text || ':' || new.user_id::text,
      jsonb_build_object('meetingId', meeting_row.id, 'startsAt', meeting_row.starts_at)
    );
  end if;
  return new;
end;
$$;

create trigger meeting_attendee_added_notification
  after insert on public.meeting_attendees
  for each row execute function private.notify_meeting_attendee_added();

create or replace function private.notify_meeting_response_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meeting_row public.meetings%rowtype;
  attendee_name text;
begin
  if new.response is not distinct from old.response then
    return new;
  end if;
  select * into meeting_row from public.meetings where id = new.meeting_id;
  if meeting_row.created_by = new.user_id then
    return new;
  end if;
  select coalesce(nullif(trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, '')), ''), p.email, 'A team member')
    into attendee_name from public.profiles p where p.id = new.user_id;
  perform private.push_notification(
    meeting_row.created_by, meeting_row.organization_id, 'meeting',
    'Meeting response updated',
    attendee_name || ' responded ' || replace(new.response, '_', ' ') || ' to ' || meeting_row.title,
    '/team/meetings', 'meetings', meeting_row.id::text, null,
    jsonb_build_object('meetingId', meeting_row.id, 'response', new.response, 'attendeeUserId', new.user_id)
  );
  return new;
end;
$$;

create trigger meeting_response_changed_notification
  after update of response on public.meeting_attendees
  for each row execute function private.notify_meeting_response_changed();

create or replace function private.notify_meeting_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if new.title is not distinct from old.title
    and new.description is not distinct from old.description
    and new.starts_at is not distinct from old.starts_at
    and new.ends_at is not distinct from old.ends_at
    and new.location is not distinct from old.location then
    return new;
  end if;

  for recipient in
    select ma.user_id from public.meeting_attendees ma
    where ma.meeting_id = new.id
      and ma.response <> 'declined'
      and ma.user_id is distinct from (select auth.uid())
  loop
    perform private.push_notification(
      recipient, new.organization_id, 'meeting',
      'Meeting updated',
      new.title || ' · ' || to_char(new.starts_at at time zone 'Africa/Harare', 'Dy DD Mon, HH24:MI'),
      '/team/meetings', 'meetings', new.id::text, null,
      jsonb_build_object('meetingId', new.id, 'startsAt', new.starts_at)
    );
  end loop;
  return new;
end;
$$;

create trigger meeting_changed_notification
  after update on public.meetings
  for each row execute function private.notify_meeting_changed();

create or replace function private.notify_schedule_assignment_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  schedule_row public.schedules%rowtype;
  recipient uuid;
begin
  select * into schedule_row from public.schedules where id = new.schedule_id;
  select m.user_id into recipient from public.access_memberships m where m.id = new.membership_id;
  if recipient is distinct from (select auth.uid()) then
    perform private.push_notification(
      recipient, schedule_row.organization_id, 'schedule',
      'New duty assigned',
      schedule_row.title || ' · ' || to_char(schedule_row.starts_at at time zone 'Africa/Harare', 'Dy DD Mon, HH24:MI'),
      '/team/schedules', 'schedules', schedule_row.id::text,
      'schedule-assignment:' || schedule_row.id::text || ':' || new.membership_id::text,
      jsonb_build_object('scheduleId', schedule_row.id, 'startsAt', schedule_row.starts_at)
    );
  end if;
  return new;
end;
$$;

create trigger schedule_assignment_added_notification
  after insert on public.schedule_assignments
  for each row execute function private.notify_schedule_assignment_added();

create or replace function private.notify_schedule_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if new.title is not distinct from old.title
    and new.description is not distinct from old.description
    and new.starts_at is not distinct from old.starts_at
    and new.ends_at is not distinct from old.ends_at
    and new.location_id is not distinct from old.location_id
    and new.status is not distinct from old.status then
    return new;
  end if;
  for recipient in
    select m.user_id
    from public.schedule_assignments a
    join public.access_memberships m on m.id = a.membership_id
    where a.schedule_id = new.id
      and m.user_id is distinct from (select auth.uid())
  loop
    perform private.push_notification(
      recipient, new.organization_id, 'schedule',
      'Duty schedule updated',
      new.title || ' · ' || to_char(new.starts_at at time zone 'Africa/Harare', 'Dy DD Mon, HH24:MI'),
      '/team/schedules', 'schedules', new.id::text, null,
      jsonb_build_object('scheduleId', new.id, 'status', new.status, 'startsAt', new.starts_at)
    );
  end loop;
  return new;
end;
$$;

create trigger schedule_changed_notification
  after update on public.schedules
  for each row execute function private.notify_schedule_changed();

create or replace function private.notify_announcement_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  for recipient in
    select m.user_id from public.access_memberships m
    where m.organization_id = new.organization_id
      and m.access_type = 'team'
      and m.status = 'active'
      and m.user_id <> new.created_by
  loop
    perform private.push_notification(
      recipient, new.organization_id, 'announcement',
      'New announcement: ' || new.title,
      left(new.body, 220), '/team/communication',
      'announcements', new.id::text,
      'announcement:' || new.id::text || ':' || recipient::text,
      jsonb_build_object('announcementId', new.id, 'category', new.category)
    );
  end loop;
  return new;
end;
$$;

create trigger announcement_published_notification
  after insert on public.announcements
  for each row execute function private.notify_announcement_published();

create or replace function private.notify_document_published()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if new.status <> 'published' or old.status = 'published' then
    return new;
  end if;
  for recipient in
    select m.user_id from public.access_memberships m
    where m.organization_id = new.organization_id
      and m.access_type = 'team'
      and m.status = 'active'
      and m.user_id <> new.created_by
  loop
    perform private.push_notification(
      recipient, new.organization_id, 'knowledge',
      'Knowledge document published', new.title,
      '/team/knowledge/' || new.id::text, 'documents', new.id::text,
      'document-published:' || new.id::text || ':' || recipient::text,
      jsonb_build_object('documentId', new.id, 'category', new.category)
    );
  end loop;
  return new;
end;
$$;

create trigger document_published_notification
  after update of status on public.documents
  for each row execute function private.notify_document_published();

create or replace function private.notify_team_access_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.access_type <> 'team' or new.organization_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  perform private.push_notification(
    new.user_id, new.organization_id, 'access',
    case new.status when 'active' then 'Team Access activated' when 'suspended' then 'Team Access suspended' else 'Team Access updated' end,
    case new.status when 'active' then 'Your Shearwater Team Access membership is active.' when 'suspended' then 'Your Shearwater Team Access membership has been suspended.' else 'Your Team Access membership status changed.' end,
    '/team/settings', 'access_memberships', new.id::text,
    'membership-status:' || new.id::text || ':' || new.status::text,
    jsonb_build_object('membershipId', new.id, 'status', new.status)
  );
  return new;
end;
$$;

create trigger team_access_changed_notification
  after insert or update of status on public.access_memberships
  for each row execute function private.notify_team_access_changed();
