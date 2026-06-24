create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  customer_name text not null,
  customer_email text,
  rating int not null check (rating between 1 and 5),
  title text,
  body text,
  source text not null default 'direct'
    check (source in ('direct', 'google', 'tripadvisor', 'booking', 'agent_submitted', 'imported')),
  status text not null default 'pending'
    check (status in ('pending', 'published', 'hidden')),
  visit_date date,
  response text,
  responded_by uuid references public.access_memberships(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reviews_org_product_idx
  on public.reviews (organization_id, product_id);
create index if not exists reviews_org_status_idx
  on public.reviews (organization_id, status, created_at desc);

drop trigger if exists reviews_updated_at on public.reviews;
create trigger reviews_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

alter table public.documents
  add column if not exists file_url text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists doc_type text not null default 'general',
  add column if not exists owner_type text not null default 'team',
  add column if not exists owner_id uuid,
  add column if not exists linked_type text,
  add column if not exists linked_id uuid,
  add column if not exists uploaded_by uuid references public.access_memberships(id) on delete set null;

alter table public.documents
  alter column content set default '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_doc_type_check'
  ) then
    alter table public.documents
      add constraint documents_doc_type_check
      check (doc_type in ('voucher', 'confirmation', 'itinerary', 'contract', 'fact_sheet', 'policy', 'media', 'general'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'documents_owner_type_check'
  ) then
    alter table public.documents
      add constraint documents_owner_type_check
      check (owner_type in ('team', 'agent', 'customer'));
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'documents_linked_type_check'
  ) then
    alter table public.documents
      add constraint documents_linked_type_check
      check (linked_type is null or linked_type in ('enquiry', 'product', 'meeting', 'review'));
  end if;
end $$;

create index if not exists documents_org_type_idx
  on public.documents (organization_id, doc_type);
create index if not exists documents_owner_idx
  on public.documents (owner_type, owner_id);
create index if not exists documents_linked_idx
  on public.documents (linked_type, linked_id);
