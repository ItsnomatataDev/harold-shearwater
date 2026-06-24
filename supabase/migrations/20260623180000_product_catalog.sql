insert into public.permissions (key, name, description)
values ('products.manage', 'Manage product catalog', 'Create, edit, publish and archive products, variants and inclusions.')
on conflict (key) do update set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select '00000000-0000-4000-8000-000000000201', id
from public.permissions where key = 'products.manage'
on conflict do nothing;

-- Products
create table public.products (
  id               uuid        primary key default gen_random_uuid(),
  organization_id  uuid        not null references public.organizations(id) on delete cascade,
  name             text        not null check (char_length(trim(name)) >= 1),
  slug             text        not null,
  short_description text,
  full_description text,
  category         text        not null default 'adventure'
                               check (category in ('adventure','scenic','water','cultural','multi_activity','transfer','accommodation')),
  status           text        not null default 'draft'
                               check (status in ('draft','active','archived')),
  min_party_size   int         not null default 1 check (min_party_size >= 1),
  max_party_size   int         check (max_party_size is null or max_party_size >= min_party_size),
  duration_minutes int         check (duration_minutes is null or duration_minutes > 0),
  location_id      uuid        references public.locations(id) on delete set null,
  cover_image_url  text,
  created_by       uuid        references public.access_memberships(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index products_org_slug_idx on public.products (organization_id, lower(slug));
create index products_org_status_idx     on public.products (organization_id, status);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Product variants (e.g. Standard, Private, Group)
create table public.product_variants (
  id          uuid        primary key default gen_random_uuid(),
  product_id  uuid        not null references public.products(id) on delete cascade,
  name        text        not null,
  description text,
  sort_order  int         not null default 0,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index product_variants_product_idx on public.product_variants (product_id, sort_order);

-- Product inclusions / exclusions / requirements
create table public.product_inclusions (
  id             uuid  primary key default gen_random_uuid(),
  product_id     uuid  not null references public.products(id) on delete cascade,
  label          text  not null,
  inclusion_type text  not null default 'included'
                       check (inclusion_type in ('included','excluded','requirement','restriction')),
  sort_order     int   not null default 0
);

create index product_inclusions_product_idx on public.product_inclusions (product_id);

-- RLS
alter table public.products           enable row level security;
alter table public.product_variants   enable row level security;
alter table public.product_inclusions enable row level security;

-- All org members (team + agent) read non-archived products
create policy products_select on public.products
  for select to authenticated
  using (status <> 'archived' and private.is_org_member(organization_id));

-- Team members with products.manage can write
create policy products_write on public.products
  for all to authenticated
  using  (private.has_permission(organization_id, 'products.manage'))
  with check (private.has_permission(organization_id, 'products.manage'));

-- Variants follow their product
create policy product_variants_select on public.product_variants
  for select to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status <> 'archived' and private.is_org_member(p.organization_id)
  ));

create policy product_variants_write on public.product_variants
  for all to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and private.has_permission(p.organization_id, 'products.manage')
  ));

-- Inclusions follow their product
create policy product_inclusions_select on public.product_inclusions
  for select to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and p.status <> 'archived' and private.is_org_member(p.organization_id)
  ));

create policy product_inclusions_write on public.product_inclusions
  for all to authenticated
  using (exists (
    select 1 from public.products p
    where p.id = product_id and private.has_permission(p.organization_id, 'products.manage')
  ));
