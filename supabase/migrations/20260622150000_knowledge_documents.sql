create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text,
  content text not null,
  category text not null,
  status text not null check (status in ('draft', 'published', 'archived')) default 'draft',
  created_by uuid not null references auth.users(id) on delete restrict,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_org_status_idx on public.documents (organization_id, status);
create index documents_category_idx on public.documents (organization_id, category);

alter table public.documents enable row level security;

create policy documents_select_published on public.documents
  for select to authenticated
  using (
    status = 'published' and private.is_org_member(organization_id)
    or created_by = (select auth.uid())
  );

create policy documents_insert_own on public.documents
  for insert to authenticated
  with check (created_by = (select auth.uid()) and private.is_org_member(organization_id));

create policy documents_update_own on public.documents
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

create trigger documents_updated_at before update on public.documents
  for each row execute function public.set_updated_at();
