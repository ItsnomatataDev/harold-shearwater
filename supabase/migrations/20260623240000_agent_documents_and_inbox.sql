
create table public.inbox_threads (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  membership_id   uuid        not null references public.access_memberships(id) on delete cascade,
  subject         text        not null,
  context_type    text        check (context_type in ('enquiry', 'booking', 'document', 'general')),
  context_id      uuid,                          -- fk to enquiry, booking, etc.
  status          text        not null default 'open'
                              check (status in ('open', 'archived')),
  last_message_at timestamptz not null default now(),
  unread_count    int         not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index inbox_threads_owner_idx
  on public.inbox_threads (membership_id, status, last_message_at desc);
create index inbox_threads_org_idx
  on public.inbox_threads (organization_id, last_message_at desc);
create index inbox_threads_context_idx
  on public.inbox_threads (context_type, context_id)
  where context_id is not null;

create trigger inbox_threads_updated_at
  before update on public.inbox_threads
  for each row execute function public.set_updated_at();

create table public.inbox_messages (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  thread_id       uuid        not null references public.inbox_threads(id) on delete cascade,
  sender_id       uuid        references public.access_memberships(id) on delete set null,
  direction       text        not null
                              check (direction in ('inbound', 'outbound', 'internal')),
  body            text        not null,
  doc_url         text,        -- Supabase Storage path for an attached document
  doc_name        text,
  doc_mime_type   text,
  is_system       boolean     not null default false,  -- auto-generated (status changes, etc.)
  read_at         timestamptz,
  created_at      timestamptz not null default now()
);

create index inbox_messages_thread_idx
  on public.inbox_messages (thread_id, created_at);

create or replace function private.can_access_inbox_thread(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.inbox_threads t
    where t.id = target_thread_id
      and (
        private.is_team_member(t.organization_id)
        or exists (
          select 1
          from public.access_memberships m
          where m.id = t.membership_id
            and m.user_id = (select auth.uid())
            and m.status = 'active'
        )
      )
  );
$$;

grant execute on function private.can_access_inbox_thread(uuid) to authenticated;

alter table public.inbox_threads  enable row level security;
alter table public.inbox_messages enable row level security;
 
create policy inbox_threads_select on public.inbox_threads
  for select to authenticated
  using (
    private.is_team_member(organization_id)
    or exists (
      select 1 from public.access_memberships m
      where m.id = membership_id
        and m.user_id = (select auth.uid())
        and m.status = 'active'
    )
  );


create policy inbox_threads_insert on public.inbox_threads
  for insert to authenticated
  with check (private.is_team_member(organization_id));


create policy inbox_threads_update on public.inbox_threads
  for update to authenticated
  using  (private.can_access_inbox_thread(id))
  with check (private.can_access_inbox_thread(id));


create policy inbox_threads_delete on public.inbox_threads
  for delete to authenticated
  using (private.is_team_member(organization_id));

create policy inbox_messages_select on public.inbox_messages
  for select to authenticated
  using (private.can_access_inbox_thread(thread_id));

create policy inbox_messages_insert on public.inbox_messages
  for insert to authenticated
  with check (private.can_access_inbox_thread(thread_id));

