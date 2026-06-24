create table public.crm_activities (
  id             uuid        primary key default gen_random_uuid(),
  organization_id uuid       not null references public.organizations(id) on delete cascade,
  contact_id     uuid        not null references public.crm_contacts(id) on delete cascade,
  membership_id  uuid        references public.access_memberships(id) on delete set null,
  type           text        not null check (type in ('note','call','email','meeting','task','harold_chat')),
  body           text        not null check (char_length(trim(body)) >= 1),
  occurred_at    timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create index crm_activities_contact_idx on public.crm_activities (contact_id, occurred_at desc);
create index crm_activities_org_idx    on public.crm_activities (organization_id, occurred_at desc);

alter table public.crm_activities enable row level security;

create policy crm_activities_select on public.crm_activities
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy crm_activities_insert on public.crm_activities
  for insert to authenticated
  with check (private.is_org_member(organization_id));

create policy crm_activities_delete on public.crm_activities
  for delete to authenticated
  using (private.has_permission(organization_id, 'crm.contacts.delete'));
