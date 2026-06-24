
create table public.agent_enquiries (
  id               uuid        primary key default gen_random_uuid(),
  organization_id  uuid        not null references public.organizations(id) on delete cascade,
  membership_id    uuid        references public.access_memberships(id) on delete set null,
  contact_name     text        not null check (char_length(trim(contact_name)) >= 1),
  contact_email    text,
  contact_phone    text,
  party_size       int         not null default 1 check (party_size >= 1),
  product_interest text,
  requested_date   date,
  notes            text,
  status           text        not null default 'new'
                               check (status in ('new','quoted','confirmed','complete','cancelled')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index agent_enquiries_org_idx     on public.agent_enquiries (organization_id, created_at desc);
create index agent_enquiries_status_idx  on public.agent_enquiries (organization_id, status);
create index agent_enquiries_member_idx  on public.agent_enquiries (membership_id);

create trigger agent_enquiries_updated_at
  before update on public.agent_enquiries
  for each row execute function public.set_updated_at();

alter table public.agent_enquiries enable row level security;

create policy agent_enquiries_select on public.agent_enquiries
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy agent_enquiries_insert on public.agent_enquiries
  for insert to authenticated
  with check (private.is_org_member(organization_id));

create policy agent_enquiries_update on public.agent_enquiries
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

create policy agent_enquiries_delete on public.agent_enquiries
  for delete to authenticated
  using (private.is_org_member(organization_id));
