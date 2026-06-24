insert into public.permissions (key, name, description)
values ('rates.manage', 'Manage rate plans', 'Create, edit and assign rate plans and agency pricing contracts.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-000000000201', id
from public.permissions where key = 'rates.manage'
on conflict do nothing;

-- Rate plans
create table public.rate_plans (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  name            text        not null check (char_length(trim(name)) >= 1),
  description     text,
  plan_type       text        not null default 'public'
                              check (plan_type in ('public','agent_default','agency_specific','staff','promotional')),
  valid_from      date,
  valid_until     date,
  active          boolean     not null default true,
  created_by      uuid        references public.access_memberships(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index rate_plans_org_idx on public.rate_plans (organization_id, active);

create trigger rate_plans_updated_at
  before update on public.rate_plans
  for each row execute function public.set_updated_at();

-- Rate plan items: price per product / variant
create table public.rate_plan_items (
  id            uuid           primary key default gen_random_uuid(),
  rate_plan_id  uuid           not null references public.rate_plans(id) on delete cascade,
  product_id    uuid           not null references public.products(id) on delete cascade,
  variant_id    uuid           references public.product_variants(id) on delete set null,
  price_per_person decimal(10,2) not null check (price_per_person >= 0),
  currency      text           not null default 'USD',
  notes         text,
  created_at    timestamptz    not null default now(),
  updated_at    timestamptz    not null default now(),
  unique (rate_plan_id, product_id, variant_id)
);

create index rate_plan_items_plan_idx    on public.rate_plan_items (rate_plan_id);
create index rate_plan_items_product_idx on public.rate_plan_items (product_id);

create trigger rate_plan_items_updated_at
  before update on public.rate_plan_items
  for each row execute function public.set_updated_at();

-- Agency rate assignments: which rate plan applies to which agent membership
create table public.agency_rate_assignments (
  id              uuid        primary key default gen_random_uuid(),
  organization_id uuid        not null references public.organizations(id) on delete cascade,
  membership_id   uuid        not null references public.access_memberships(id) on delete cascade,
  rate_plan_id    uuid        not null references public.rate_plans(id) on delete cascade,
  assigned_by     uuid        references public.access_memberships(id) on delete set null,
  assigned_at     timestamptz not null default now(),
  unique (membership_id, rate_plan_id)
);

create index agency_rate_assignments_membership_idx on public.agency_rate_assignments (membership_id);
create index agency_rate_assignments_org_idx        on public.agency_rate_assignments (organization_id);

-- RLS
alter table public.rate_plans              enable row level security;
alter table public.rate_plan_items         enable row level security;
alter table public.agency_rate_assignments enable row level security;

-- Rate plans: team manages all; agents see only their assigned ones
create policy rate_plans_team_select on public.rate_plans
  for select to authenticated
  using (private.has_permission(organization_id, 'rates.manage'));

create policy rate_plans_agent_select on public.rate_plans
  for select to authenticated
  using (exists (
    select 1 from public.agency_rate_assignments ara
    join  public.access_memberships am on am.id = ara.membership_id
    where ara.rate_plan_id = rate_plans.id
      and am.user_id = auth.uid()
      and am.access_type = 'agent'
      and am.status = 'active'
  ));

create policy rate_plans_write on public.rate_plans
  for all to authenticated
  using  (private.has_permission(organization_id, 'rates.manage'))
  with check (private.has_permission(organization_id, 'rates.manage'));

-- Rate plan items follow rate plan visibility
create policy rate_plan_items_select on public.rate_plan_items
  for select to authenticated
  using (exists (
    select 1 from public.rate_plans rp
    where rp.id = rate_plan_id
      and (
        private.has_permission(rp.organization_id, 'rates.manage')
        or exists (
          select 1 from public.agency_rate_assignments ara
          join  public.access_memberships am on am.id = ara.membership_id
          where ara.rate_plan_id = rp.id
            and am.user_id = auth.uid()
            and am.access_type = 'agent'
            and am.status = 'active'
        )
      )
  ));

create policy rate_plan_items_write on public.rate_plan_items
  for all to authenticated
  using (exists (
    select 1 from public.rate_plans rp
    where rp.id = rate_plan_id
      and private.has_permission(rp.organization_id, 'rates.manage')
  ));

-- Assignments: team manages; agents read their own
create policy agency_rate_select on public.agency_rate_assignments
  for select to authenticated
  using (
    private.has_permission(organization_id, 'rates.manage')
    or exists (
      select 1 from public.access_memberships am
      where am.id = membership_id and am.user_id = auth.uid()
    )
  );

create policy agency_rate_write on public.agency_rate_assignments
  for all to authenticated
  using  (private.has_permission(organization_id, 'rates.manage'))
  with check (private.has_permission(organization_id, 'rates.manage'));
