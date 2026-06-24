
alter table public.agent_enquiries
  drop constraint if exists agent_enquiries_status_check;

alter table public.agent_enquiries
  add constraint agent_enquiries_status_check
  check (status in (
    'new',
    'qualifying',
    'quote_requested',
    'quoted',
    'reservation_requested',
    'confirmed',
    'complete',
    'cancelled'
  ));

alter table public.agent_enquiries
  add column if not exists reference text,
  add column if not exists external_booking_reference text,
  add column if not exists quote_amount numeric(12,2),
  add column if not exists quote_currency text not null default 'USD',
  add column if not exists last_contact_at timestamptz,
  add column if not exists follow_up_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.agent_enquiries
set reference = 'SW-' || upper(substr(replace(id::text, '-', ''), 1, 8))
where reference is null;

alter table public.agent_enquiries
  alter column reference set not null;

create unique index if not exists agent_enquiries_org_reference_idx
  on public.agent_enquiries (organization_id, reference);

create table public.agent_enquiry_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  enquiry_id uuid not null references public.agent_enquiries(id) on delete cascade,
  actor_membership_id uuid references public.access_memberships(id) on delete set null,
  event_type text not null
    check (event_type in ('created', 'note', 'status_changed', 'email', 'document', 'quote', 'reservation', 'review', 'upsell')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index agent_enquiry_events_enquiry_idx
  on public.agent_enquiry_events (enquiry_id, created_at desc);

create table public.agent_enquiry_followups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  enquiry_id uuid not null references public.agent_enquiries(id) on delete cascade,
  membership_id uuid references public.access_memberships(id) on delete set null,
  kind text not null default 'general'
    check (kind in ('general', 'post_sale', 'review', 'upsell')),
  title text not null,
  notes text,
  due_at timestamptz,
  status text not null default 'open'
    check (status in ('open', 'completed', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index agent_enquiry_followups_enquiry_idx
  on public.agent_enquiry_followups (enquiry_id, status, due_at);

create trigger agent_enquiry_followups_updated_at
  before update on public.agent_enquiry_followups
  for each row execute function public.set_updated_at();

create or replace function private.can_access_agent_enquiry(target_enquiry_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.agent_enquiries e
    where e.id = target_enquiry_id
      and (
        private.is_team_member(e.organization_id)
        or (
          e.membership_id is not null
          and private.owns_agent_membership(e.membership_id, e.organization_id)
        )
      )
  );
$$;

grant execute on function private.can_access_agent_enquiry(uuid) to authenticated;

alter table public.agent_enquiry_events enable row level security;
alter table public.agent_enquiry_followups enable row level security;

create policy agent_enquiry_events_select on public.agent_enquiry_events
  for select to authenticated
  using (private.can_access_agent_enquiry(enquiry_id));

create policy agent_enquiry_events_insert on public.agent_enquiry_events
  for insert to authenticated
  with check (
    private.can_access_agent_enquiry(enquiry_id)
    and (
      actor_membership_id is null
      or private.is_team_member(organization_id)
      or private.owns_agent_membership(actor_membership_id, organization_id)
    )
  );

create policy agent_enquiry_followups_select on public.agent_enquiry_followups
  for select to authenticated
  using (private.can_access_agent_enquiry(enquiry_id));

create policy agent_enquiry_followups_insert on public.agent_enquiry_followups
  for insert to authenticated
  with check (
    private.can_access_agent_enquiry(enquiry_id)
    and (
      membership_id is null
      or private.is_team_member(organization_id)
      or private.owns_agent_membership(membership_id, organization_id)
    )
  );

create policy agent_enquiry_followups_update on public.agent_enquiry_followups
  for update to authenticated
  using (private.can_access_agent_enquiry(enquiry_id))
  with check (private.can_access_agent_enquiry(enquiry_id));

create policy agent_enquiry_followups_delete on public.agent_enquiry_followups
  for delete to authenticated
  using (private.can_access_agent_enquiry(enquiry_id));
