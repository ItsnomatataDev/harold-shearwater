create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  first_name text not null check (char_length(trim(first_name)) >= 1),
  last_name text not null default '',
  email text,
  phone text,
  nationality text,
  source text check (source in ('direct', 'agent', 'harold_chat', 'referral', 'walk_in', 'website', 'other')),
  source_detail text,
  status text not null default 'lead' check (status in ('lead', 'prospect', 'active', 'past_guest', 'vip', 'lost')),
  owner_membership_id uuid references public.access_memberships(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index crm_contacts_org_updated_idx on public.crm_contacts (organization_id, updated_at desc);
create index crm_contacts_org_name_idx on public.crm_contacts (organization_id, lower(first_name), lower(last_name));
create index crm_contacts_email_idx on public.crm_contacts (lower(email)) where email is not null;

create trigger crm_contacts_updated_at
  before update on public.crm_contacts
  for each row execute function public.set_updated_at();

alter table public.crm_contacts enable row level security;

create policy crm_contacts_select on public.crm_contacts
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy crm_contacts_insert on public.crm_contacts
  for insert to authenticated
  with check (private.is_org_member(organization_id));

create policy crm_contacts_update on public.crm_contacts
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

create policy crm_contacts_delete on public.crm_contacts
  for delete to authenticated
  using (private.has_permission(organization_id, 'crm.contacts.delete'));
