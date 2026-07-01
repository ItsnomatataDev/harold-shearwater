create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  membership_id uuid not null references public.access_memberships(id) on delete cascade,
  access_type public.access_type not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null check (char_length(trim(product_name)) >= 1),
  preferred_date date,
  end_date date,
  party_size int not null default 1 check (party_size >= 1),
  option_label text,
  notes text,
  availability_snapshot jsonb not null default '{}'::jsonb,
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'confirmed', 'cancelled')),
  reference text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_requests_org_reference_idx
  on public.booking_requests (organization_id, reference);

create index if not exists booking_requests_org_created_idx
  on public.booking_requests (organization_id, created_at desc);

create index if not exists booking_requests_membership_idx
  on public.booking_requests (membership_id, created_at desc);

create trigger booking_requests_updated_at
  before update on public.booking_requests
  for each row execute function public.set_updated_at();

alter table public.booking_requests enable row level security;

create policy booking_requests_select on public.booking_requests
  for select to authenticated
  using (
    private.is_team_member(organization_id)
    or membership_id in (
      select id from public.access_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy booking_requests_insert on public.booking_requests
  for insert to authenticated
  with check (
    membership_id in (
      select id from public.access_memberships
      where user_id = auth.uid() and status = 'active'
    )
  );

create policy booking_requests_update on public.booking_requests
  for update to authenticated
  using (private.is_team_member(organization_id))
  with check (private.is_team_member(organization_id));
