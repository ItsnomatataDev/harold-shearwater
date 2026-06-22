create table public.harold_conversations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index harold_conversations_org_user_idx on public.harold_conversations (organization_id, user_id);

create table public.harold_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.harold_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index harold_messages_conversation_idx on public.harold_messages (conversation_id);

alter table public.harold_conversations enable row level security;
alter table public.harold_messages enable row level security;

create policy harold_conversations_select_own on public.harold_conversations
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy harold_conversations_insert_own on public.harold_conversations
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy harold_messages_select_user on public.harold_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.harold_conversations
      where harold_conversations.id = harold_messages.conversation_id
        and harold_conversations.user_id = (select auth.uid())
    )
  );

create policy harold_messages_insert_assistant on public.harold_messages
  for insert to authenticated
  with check (
    exists (
      select 1 from public.harold_conversations
      where harold_conversations.id = harold_messages.conversation_id
        and harold_conversations.user_id = (select auth.uid())
    )
  );
