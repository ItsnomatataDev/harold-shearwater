-- Keep document delivery and human chat as separate products.

insert into storage.buckets (id, name, public, file_size_limit)
values ('document-inbox', 'document-inbox', false, 26214400)
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit;

create table public.document_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  recipient_access public.access_type not null,
  delivered_by uuid references public.access_memberships(id) on delete set null,
  read_at timestamptz,
  delivered_at timestamptz not null default now(),
  unique (document_id, recipient_user_id, recipient_access)
);

create index document_deliveries_recipient_idx
  on public.document_deliveries (recipient_user_id, delivered_at desc);
create index document_deliveries_org_idx
  on public.document_deliveries (organization_id, delivered_at desc);

alter table public.document_deliveries enable row level security;

create policy document_deliveries_select on public.document_deliveries
  for select to authenticated
  using (
    recipient_user_id = (select auth.uid())
    or private.is_team_member(organization_id)
  );

create policy document_deliveries_insert_team on public.document_deliveries
  for insert to authenticated
  with check (private.is_team_member(organization_id));

create policy document_deliveries_update_recipient on public.document_deliveries
  for update to authenticated
  using (recipient_user_id = (select auth.uid()))
  with check (recipient_user_id = (select auth.uid()));

create policy document_deliveries_delete_team on public.document_deliveries
  for delete to authenticated
  using (private.is_team_member(organization_id));

drop policy if exists documents_select_team_or_agent on public.documents;
create policy documents_select_team_or_recipient on public.documents
  for select to authenticated
  using (
    private.is_team_member(organization_id)
    or exists (
      select 1
      from public.document_deliveries delivery
      where delivery.document_id = documents.id
        and delivery.recipient_user_id = (select auth.uid())
    )
    or (
      private.is_agent_member(organization_id)
      and owner_type = 'team'
      and status = 'published'
    )
  );

create or replace function private.notify_document_delivery()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  document_title text;
  target_href text;
begin
  select document.title into document_title
  from public.documents document where document.id = new.document_id;

  target_href := case new.recipient_access
    when 'team' then '/team/inbox'
    when 'agent' then '/agent/inbox'
    else '/customer/inbox'
  end;

  perform private.push_notification(
    new.recipient_user_id, new.organization_id, 'system',
    'New document received', coalesce(document_title, 'A document was sent to you.'),
    target_href, 'document_deliveries', new.id::text,
    'document-delivery:' || new.id::text,
    jsonb_build_object('documentId', new.document_id, 'deliveryId', new.id)
  );
  return new;
end;
$$;

create trigger document_delivery_notification
  after insert on public.document_deliveries
  for each row execute function private.notify_document_delivery();

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.chat_participants (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  access_type public.access_type not null,
  membership_id uuid references public.access_memberships(id) on delete set null,
  last_read_at timestamptz,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id, access_type)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete restrict,
  sender_access public.access_type not null,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index chat_conversations_org_idx on public.chat_conversations (organization_id, updated_at desc);
create index chat_participants_user_idx on public.chat_participants (user_id, joined_at desc);
create index chat_messages_conversation_idx on public.chat_messages (conversation_id, created_at);

create trigger chat_conversations_updated_at
  before update on public.chat_conversations
  for each row execute function public.set_updated_at();

alter table public.chat_conversations enable row level security;
alter table public.chat_participants enable row level security;
alter table public.chat_messages enable row level security;

create or replace function private.is_chat_participant(target_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.chat_participants participant
    where participant.conversation_id = target_conversation_id
      and participant.user_id = (select auth.uid())
  );
$$;
revoke all on function private.is_chat_participant(uuid) from public;
grant execute on function private.is_chat_participant(uuid) to authenticated;

create policy chat_conversations_select on public.chat_conversations
  for select to authenticated using (private.is_chat_participant(id));
create policy chat_conversations_insert_team on public.chat_conversations
  for insert to authenticated
  with check (private.is_team_member(organization_id) and created_by = (select auth.uid()));
create policy chat_conversations_update_participant on public.chat_conversations
  for update to authenticated using (private.is_chat_participant(id));

create policy chat_participants_select on public.chat_participants
  for select to authenticated using (private.is_chat_participant(conversation_id));
create policy chat_participants_insert_team on public.chat_participants
  for insert to authenticated
  with check (exists (
    select 1 from public.chat_conversations conversation
    where conversation.id = conversation_id
      and private.is_team_member(conversation.organization_id)
  ));
create policy chat_participants_update_self on public.chat_participants
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy chat_messages_select on public.chat_messages
  for select to authenticated using (private.is_chat_participant(conversation_id));
create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and private.is_chat_participant(conversation_id)
  );

create or replace function private.touch_chat_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.chat_conversations set updated_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;
create trigger chat_message_touch_conversation
  after insert on public.chat_messages
  for each row execute function private.touch_chat_conversation();

create or replace function private.notify_chat_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient record;
  conversation_title text;
  target_href text;
begin
  select title into conversation_title from public.chat_conversations where id = new.conversation_id;
  for recipient in
    select participant.user_id, participant.access_type
    from public.chat_participants participant
    where participant.conversation_id = new.conversation_id
      and participant.user_id <> new.sender_user_id
  loop
    target_href := case recipient.access_type
      when 'team' then '/team/chat'
      when 'agent' then '/agent/chat'
      else '/customer/chat'
    end;
    perform private.push_notification(
      recipient.user_id,
      (select organization_id from public.chat_conversations where id = new.conversation_id),
      'system', 'New chat message', coalesce(conversation_title, 'Conversation'),
      target_href, 'chat_conversations', new.conversation_id::text,
      'chat-message:' || new.id::text || ':' || recipient.user_id::text,
      jsonb_build_object('conversationId', new.conversation_id, 'messageId', new.id)
    );
  end loop;
  return new;
end;
$$;
create trigger chat_message_notification
  after insert on public.chat_messages
  for each row execute function private.notify_chat_message();

do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;
