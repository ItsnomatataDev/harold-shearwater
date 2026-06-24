create table public.crm_deals (
  id                  uuid          primary key default gen_random_uuid(),
  organization_id     uuid          not null references public.organizations(id) on delete cascade,
  contact_id          uuid          not null references public.crm_contacts(id) on delete cascade,
  owner_membership_id uuid          references public.access_memberships(id) on delete set null,
  title               text          not null check (char_length(trim(title)) >= 1),
  value               numeric(12,2),
  currency            text          not null default 'USD',
  stage               text          not null default 'enquiry'
                                    check (stage in ('enquiry','quoted','confirmed','complete','lost')),
  close_date          date,
  notes               text,
  created_at          timestamptz   not null default now(),
  updated_at          timestamptz   not null default now()
);

create index crm_deals_org_stage_idx   on public.crm_deals (organization_id, stage);
create index crm_deals_contact_idx     on public.crm_deals (contact_id);
create index crm_deals_org_updated_idx on public.crm_deals (organization_id, updated_at desc);

create trigger crm_deals_updated_at
  before update on public.crm_deals
  for each row execute function public.set_updated_at();

alter table public.crm_deals enable row level security;

create policy crm_deals_select on public.crm_deals
  for select to authenticated
  using (private.is_org_member(organization_id));

create policy crm_deals_insert on public.crm_deals
  for insert to authenticated
  with check (private.is_org_member(organization_id));

create policy crm_deals_update on public.crm_deals
  for update to authenticated
  using (private.is_org_member(organization_id))
  with check (private.is_org_member(organization_id));

create policy crm_deals_delete on public.crm_deals
  for delete to authenticated
  using (private.is_org_member(organization_id));
