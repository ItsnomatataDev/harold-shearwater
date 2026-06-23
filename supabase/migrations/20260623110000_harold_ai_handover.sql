alter table public.harold_conversations
  add column if not exists source_access public.access_type not null default 'team',
  add column if not exists status text not null default 'ai_active',
  add column if not exists handover_requested_at timestamptz,
  add column if not exists handover_requested_by text,
  add column if not exists handover_reason text,
  add column if not exists assigned_to_membership_id uuid references public.access_memberships(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists last_message_at timestamptz not null default now();

alter table public.harold_conversations
  drop constraint if exists harold_conversations_status_check,
  add constraint harold_conversations_status_check
    check (status in ('ai_active', 'handover_requested', 'human_active', 'resolved')),
  drop constraint if exists harold_conversations_handover_requested_by_check,
  add constraint harold_conversations_handover_requested_by_check
    check (handover_requested_by is null or handover_requested_by in ('user', 'ai'));

create index if not exists harold_conversations_handover_queue_idx
  on public.harold_conversations (organization_id, status, last_message_at desc)
  where status <> 'ai_active';

alter table public.harold_messages
  add column if not exists author_user_id uuid references auth.users(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.harold_messages
  drop constraint if exists harold_messages_role_check,
  add constraint harold_messages_role_check
    check (role in ('user', 'assistant', 'human', 'system'));

insert into public.permissions (key, name, description)
values (
  'harold.handovers.manage',
  'Manage Harold handovers',
  'Claim and respond to AI conversations handed over to Team Access.'
)
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-000000000201', id
from public.permissions
where key = 'harold.handovers.manage'
on conflict do nothing;

drop policy if exists harold_conversations_select_own on public.harold_conversations;
create policy harold_conversations_select_owner_or_handover_staff
  on public.harold_conversations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or (
      status <> 'ai_active'
      and private.has_permission(organization_id, 'harold.handovers.manage')
    )
  );

drop policy if exists harold_conversations_update_own on public.harold_conversations;

drop policy if exists harold_messages_select_user on public.harold_messages;
create policy harold_messages_select_owner_or_handover_staff
  on public.harold_messages
  for select to authenticated
  using (
    exists (
      select 1
      from public.harold_conversations c
      where c.id = conversation_id
        and (
          c.user_id = (select auth.uid())
          or (
            c.status <> 'ai_active'
            and private.has_permission(c.organization_id, 'harold.handovers.manage')
          )
        )
    )
  );

create policy harold_messages_insert_assigned_human
  on public.harold_messages
  for insert to authenticated
  with check (
    role = 'human'
    and author_user_id = (select auth.uid())
    and exists (
      select 1
      from public.harold_conversations c
      join public.access_memberships m
        on m.id = c.assigned_to_membership_id
      where c.id = conversation_id
        and c.status = 'human_active'
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );

create or replace function public.request_harold_handover(
  target_conversation_id uuid,
  requested_reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.harold_conversations
  set status = 'handover_requested',
      handover_requested_at = now(),
      handover_requested_by = 'user',
      handover_reason = nullif(trim(requested_reason), ''),
      assigned_to_membership_id = null,
      resolved_at = null,
      updated_at = now()
  where id = target_conversation_id
    and user_id = (select auth.uid())
    and status = 'ai_active';

  if not found then
    raise exception 'Conversation cannot be handed over.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.claim_harold_handover(
  target_conversation_id uuid,
  target_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
begin
  select c.organization_id into target_organization_id
  from public.harold_conversations c
  where c.id = target_conversation_id
    and c.status = 'handover_requested';

  if target_organization_id is null
    or not private.has_permission(target_organization_id, 'harold.handovers.manage')
    or not exists (
      select 1 from public.access_memberships m
      where m.id = target_membership_id
        and m.user_id = (select auth.uid())
        and m.organization_id = target_organization_id
        and m.access_type = 'team'
        and m.status = 'active'
    ) then
    raise exception 'Handover cannot be claimed.' using errcode = '42501';
  end if;

  update public.harold_conversations
  set status = 'human_active',
      assigned_to_membership_id = target_membership_id,
      updated_at = now()
  where id = target_conversation_id
    and status = 'handover_requested';

  if not found then
    raise exception 'Handover is no longer available.' using errcode = '40001';
  end if;
end;
$$;

create or replace function public.resolve_harold_handover(
  target_conversation_id uuid,
  target_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.harold_conversations c
  set status = 'resolved',
      resolved_at = now(),
      updated_at = now()
  where c.id = target_conversation_id
    and c.status = 'human_active'
    and c.assigned_to_membership_id = target_membership_id
    and exists (
      select 1 from public.access_memberships m
      where m.id = target_membership_id
        and m.user_id = (select auth.uid())
        and m.organization_id = c.organization_id
        and m.status = 'active'
    );

  if not found then
    raise exception 'Only the assigned team member can resolve this handover.' using errcode = '42501';
  end if;
end;
$$;

grant execute on function public.request_harold_handover(uuid, text) to authenticated;
grant execute on function public.claim_harold_handover(uuid, uuid) to authenticated;
grant execute on function public.resolve_harold_handover(uuid, uuid) to authenticated;

create or replace function private.touch_harold_conversation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.harold_conversations
  set updated_at = now(),
      last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists harold_message_touch_conversation on public.harold_messages;
create trigger harold_message_touch_conversation
  after insert on public.harold_messages
  for each row execute function private.touch_harold_conversation();

create or replace function private.notify_harold_handover_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  if new.status = 'handover_requested' and old.status is distinct from new.status then
    for recipient in
      select distinct m.user_id
      from public.access_memberships m
      join public.membership_roles mr on mr.membership_id = m.id
      join public.role_permissions rp on rp.role_id = mr.role_id
      join public.permissions p on p.id = rp.permission_id
      where m.organization_id = new.organization_id
        and m.access_type = 'team'
        and m.status = 'active'
        and p.key = 'harold.handovers.manage'
        and m.user_id <> new.user_id
    loop
      perform private.push_notification(
        recipient,
        new.organization_id,
        'system',
        'Harold handover requested',
        new.title,
        '/team/communication/handovers',
        'harold_conversations',
        new.id::text,
        'harold-handover-request:' || new.id::text,
        jsonb_build_object('conversationId', new.id)
      );
    end loop;
  elsif new.status = 'human_active' and old.status is distinct from new.status then
    perform private.push_notification(
      new.user_id,
      new.organization_id,
      'system',
      'A team member joined your conversation',
      new.title,
      '/team/harold',
      'harold_conversations',
      new.id::text,
      'harold-handover-claimed:' || new.id::text,
      jsonb_build_object('conversationId', new.id)
    );
  elsif new.status = 'resolved' and old.status is distinct from new.status then
    perform private.push_notification(
      new.user_id,
      new.organization_id,
      'system',
      'Harold conversation resolved',
      new.title,
      '/team/harold',
      'harold_conversations',
      new.id::text,
      'harold-handover-resolved:' || new.id::text,
      jsonb_build_object('conversationId', new.id)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists harold_handover_status_notification on public.harold_conversations;
create trigger harold_handover_status_notification
  after update of status on public.harold_conversations
  for each row execute function private.notify_harold_handover_status();

create or replace function private.notify_harold_human_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.harold_conversations%rowtype;
begin
  if new.role <> 'human' then
    return new;
  end if;

  select * into conversation_row
  from public.harold_conversations
  where id = new.conversation_id;

  perform private.push_notification(
    conversation_row.user_id,
    conversation_row.organization_id,
    'system',
    'New human reply from Team Access',
    left(new.content, 180),
    '/team/harold',
    'harold_messages',
    new.id::text,
    'harold-human-message:' || new.id::text,
    jsonb_build_object('conversationId', new.conversation_id, 'messageId', new.id)
  );
  return new;
end;
$$;

drop trigger if exists harold_human_message_notification on public.harold_messages;
create trigger harold_human_message_notification
  after insert on public.harold_messages
  for each row execute function private.notify_harold_human_message();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'harold_conversations'
  ) then
    execute 'alter publication supabase_realtime add table public.harold_conversations';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'harold_messages'
  ) then
    execute 'alter publication supabase_realtime add table public.harold_messages';
  end if;
end
$$;
