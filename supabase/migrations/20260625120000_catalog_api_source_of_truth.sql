alter table public.organizations
  add column if not exists external_id text,
  add column if not exists external_source text;

create unique index if not exists organizations_agency_external_ref_idx
  on public.organizations (external_source, external_id)
  where external_id is not null and type = 'agency';

alter table public.catalog_sync_runs
  drop constraint if exists catalog_sync_runs_resource_type_check;

alter table public.catalog_sync_runs
  add constraint catalog_sync_runs_resource_type_check
  check (resource_type in ('product', 'rate_plan', 'agency'));

update public.permissions
set name = 'View product catalog',
    description = 'View API-synced products, variants and catalog usage.'
where key = 'products.view';

update public.permissions
set name = 'View rate plans',
    description = 'View API-synced rate plans and agency pricing.'
where key = 'rates.view';

update public.permissions
set name = 'Manage product catalog (deprecated)',
    description = 'Legacy permission. Catalog writes happen through the integration API only.'
where key = 'products.manage';

update public.permissions
set name = 'Manage rate plans (deprecated)',
    description = 'Legacy permission. Rate writes happen through the integration API only.'
where key = 'rates.manage';

delete from public.role_permissions
where permission_id in (
  select id from public.permissions where key in ('products.manage', 'rates.manage')
);

update public.roles
set name = 'Commercial Specialist',
    description = 'View API-synced catalog data and handle commercial AI handovers.'
where key = 'commercial_specialist'
  and access_type = 'team';

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.key = 'commercial_specialist'
  and role.access_type = 'team'
  and permission.key in (
    'basecamp.view',
    'products.view',
    'rates.view',
    'harold.handovers.manage'
  )
on conflict do nothing;

-- Remove authenticated portal writes. Integration service role bypasses RLS.
drop policy if exists products_write on public.products;
drop policy if exists product_variants_write on public.product_variants;
drop policy if exists product_inclusions_write on public.product_inclusions;
drop policy if exists rate_plans_write on public.rate_plans;
drop policy if exists rate_plan_items_write on public.rate_plan_items;
drop policy if exists agency_rate_assignments_write on public.agency_rate_assignments;

create or replace function private.member_can_handle_handover(
  target_organization_id uuid,
  target_membership_id uuid,
  target_domain text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  required_permissions text[];
  required_permission text;
begin
  if not exists (
    select 1
    from public.access_memberships membership
    where membership.id = target_membership_id
      and membership.organization_id = target_organization_id
      and membership.access_type = 'team'
      and membership.status = 'active'
  ) then
    return false;
  end if;

  required_permissions := case coalesce(target_domain, 'general')
    when 'commercial' then array['products.view', 'rates.view']
    when 'reservations' then array['schedules.manage', 'tasks.manage']
    when 'guest_relations' then array['harold.handovers.manage']
    when 'operations' then array['tasks.manage', 'schedules.manage']
    else array['harold.handovers.manage']
  end;

  foreach required_permission in array required_permissions loop
    if private.membership_has_permission(target_membership_id, required_permission) then
      return true;
    end if;
  end loop;

  return false;
end;
$$;
