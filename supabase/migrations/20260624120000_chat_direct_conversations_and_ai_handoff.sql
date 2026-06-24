alter table public.chat_conversations
  add column if not exists conversation_type text not null default 'direct'
    check (conversation_type in ('direct', 'group')),
  add column if not exists direct_key text,
  add column if not exists source_harold_id uuid references public.harold_conversations(id) on delete set null;

create unique index if not exists chat_conversations_direct_key_idx
  on public.chat_conversations (direct_key) where direct_key is not null;
create unique index if not exists chat_conversations_harold_idx
  on public.chat_conversations (source_harold_id) where source_harold_id is not null;

alter table public.harold_conversations
  add column if not exists chat_conversation_id uuid references public.chat_conversations(id) on delete set null;

create or replace function public.start_direct_chat(target_membership_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  caller_user_id uuid := (select auth.uid());
  caller_membership public.access_memberships%rowtype;
  target_membership public.access_memberships%rowtype;
  target_name text;
  conversation_id uuid;
  key_value text;
begin
  select * into caller_membership from public.access_memberships membership
  where membership.user_id = caller_user_id and membership.access_type in ('team', 'agent')
    and membership.status = 'active' and membership.organization_id is not null limit 1;
  if not found then raise exception 'Team or Agent Access is required.' using errcode = '42501'; end if;

  select * into target_membership from public.access_memberships membership
  where membership.id = target_membership_id and membership.status = 'active';
  if not found or not (
    target_membership.organization_id = caller_membership.organization_id
    or (caller_membership.access_type = 'team' and target_membership.access_type = 'customer')
  ) then
    raise exception 'The selected user is unavailable.' using errcode = '42501';
  end if;

  key_value := caller_membership.organization_id::text || ':' ||
    least(caller_user_id::text || ':' || caller_membership.access_type::text, target_membership.user_id::text || ':' || target_membership.access_type::text) || ':' ||
    greatest(caller_user_id::text || ':' || caller_membership.access_type::text, target_membership.user_id::text || ':' || target_membership.access_type::text);
  select id into conversation_id from public.chat_conversations where direct_key = key_value;
  if conversation_id is not null then return conversation_id; end if;

  select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), email, 'Conversation')
    into target_name from public.profiles where id = target_membership.user_id;
  insert into public.chat_conversations (organization_id, title, created_by, conversation_type, direct_key)
  values (caller_membership.organization_id, target_name, caller_user_id, 'direct', key_value)
  returning id into conversation_id;
  insert into public.chat_participants (conversation_id, user_id, access_type, membership_id)
  values
    (conversation_id, caller_user_id, caller_membership.access_type, caller_membership.id),
    (conversation_id, target_membership.user_id, target_membership.access_type, target_membership.id);
  return conversation_id;
end;
$$;
revoke all on function public.start_direct_chat(uuid) from public;
grant execute on function public.start_direct_chat(uuid) to authenticated;

create or replace function private.create_chat_from_harold_handoff()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  assigned_membership public.access_memberships%rowtype;
  requester_membership public.access_memberships%rowtype;
  requester_name text;
  conversation_id uuid;
begin
  if new.status <> 'human_active' or old.status is not distinct from new.status
    or new.assigned_to_membership_id is null or new.chat_conversation_id is not null then return new; end if;
  select * into assigned_membership from public.access_memberships where id = new.assigned_to_membership_id and access_type = 'team';
  select * into requester_membership from public.access_memberships membership
  where membership.user_id = new.user_id and membership.access_type = new.source_access and membership.status = 'active'
    and (membership.organization_id = new.organization_id or membership.access_type = 'customer') limit 1;
  if assigned_membership.id is null or requester_membership.id is null then return new; end if;
  select coalesce(nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''), email, new.title)
    into requester_name from public.profiles where id = new.user_id;
  insert into public.chat_conversations (organization_id, title, created_by, conversation_type, source_harold_id)
  values (new.organization_id, requester_name, assigned_membership.user_id, 'direct', new.id) returning id into conversation_id;
  insert into public.chat_participants (conversation_id, user_id, access_type, membership_id)
  values
    (conversation_id, assigned_membership.user_id, 'team', assigned_membership.id),
    (conversation_id, new.user_id, new.source_access, requester_membership.id);
  insert into public.chat_messages (conversation_id, sender_user_id, sender_access, body)
  values (conversation_id, assigned_membership.user_id, 'team', 'Harold handed this conversation to the team' || case when new.handover_reason is not null then ': ' || new.handover_reason else '.' end);
  update public.harold_conversations set chat_conversation_id = conversation_id where id = new.id;
  return new;
end;
$$;
drop trigger if exists harold_handoff_create_chat on public.harold_conversations;
create trigger harold_handoff_create_chat after update of status on public.harold_conversations
  for each row execute function private.create_chat_from_harold_handoff();
