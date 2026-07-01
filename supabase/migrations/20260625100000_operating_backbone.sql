insert into public.permissions (key, name, description) values
  ('products.view', 'View product catalog', 'View products, variants and catalog usage in Team Access.'),
  ('rates.view', 'View rate plans', 'View rate plans and agency pricing in Team Access.')
on conflict (key) do update
set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.key = 'team_admin'
  and role.access_type = 'team'
  and permission.key in ('products.view', 'rates.view')
on conflict do nothing;


insert into public.roles (organization_id, access_type, name, key, description, system_role)
select org.id, 'team', 'Commercial Specialist', 'commercial_specialist',
  'Manage products, rates and commercial handovers in Team Access.', true
from public.organizations org
where org.type = 'shearwater'
on conflict (organization_id, access_type, key) do update
set name = excluded.name, description = excluded.description;

insert into public.role_permissions (role_id, permission_id)
select role.id, permission.id
from public.roles role
cross join public.permissions permission
where role.key = 'commercial_specialist'
  and role.access_type = 'team'
  and permission.key in (
    'basecamp.view',
    'products.view',
    'products.manage',
    'rates.view',
    'rates.manage',
    'harold.handovers.manage'
  )
on conflict do nothing;

alter table public.products
  add column if not exists external_source text not null default 'manual'
    check (external_source in ('manual', 'activitar', 'api')),
  add column if not exists external_id text,
  add column if not exists sync_status text not null default 'manual'
    check (sync_status in ('manual', 'pending', 'synced', 'error')),
  add column if not exists last_synced_at timestamptz,
  add column if not exists sync_error text,
  add column if not exists external_payload jsonb;

create unique index if not exists products_external_ref_idx
  on public.products (organization_id, external_source, external_id)
  where external_id is not null;

alter table public.rate_plans
  add column if not exists external_source text not null default 'manual'
    check (external_source in ('manual', 'activitar', 'api')),
  add column if not exists external_id text,
  add column if not exists sync_status text not null default 'manual'
    check (sync_status in ('manual', 'pending', 'synced', 'error')),
  add column if not exists last_synced_at timestamptz,
  add column if not exists sync_error text,
  add column if not exists external_payload jsonb;

create unique index if not exists rate_plans_external_ref_idx
  on public.rate_plans (organization_id, external_source, external_id)
  where external_id is not null;

create table if not exists public.catalog_sync_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  resource_type text not null check (resource_type in ('product', 'rate_plan')),
  external_source text not null,
  status text not null check (status in ('received', 'applied', 'failed')),
  external_id text,
  internal_id uuid,
  payload jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists catalog_sync_runs_org_idx
  on public.catalog_sync_runs (organization_id, created_at desc);

alter table public.catalog_sync_runs enable row level security;

create policy catalog_sync_runs_select_manager on public.catalog_sync_runs
  for select to authenticated
  using (
    private.has_permission(organization_id, 'products.manage')
    or private.has_permission(organization_id, 'rates.manage')
    or private.is_team_admin(organization_id)
  );

alter table public.harold_conversations
  add column if not exists handover_domain text not null default 'general'
    check (handover_domain in ('commercial', 'reservations', 'guest_relations', 'operations', 'general'));

create or replace function private.membership_has_permission(
  target_membership_id uuid,
  required_permission text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.membership_roles membership_role
    join public.role_permissions role_permission
      on role_permission.role_id = membership_role.role_id
    join public.permissions permission
      on permission.id = role_permission.permission_id
    where membership_role.membership_id = target_membership_id
      and permission.key = required_permission
  )
  or exists (
    select 1
    from public.membership_roles membership_role
    join public.roles role on role.id = membership_role.role_id
    where membership_role.membership_id = target_membership_id
      and role.key = 'team_admin'
      and role.access_type = 'team'
  );
$$;

revoke all on function private.membership_has_permission(uuid, text) from public;
grant execute on function private.membership_has_permission(uuid, text) to authenticated;

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
    when 'commercial' then array['products.manage', 'rates.manage']
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

revoke all on function private.member_can_handle_handover(uuid, uuid, text) from public;
grant execute on function private.member_can_handle_handover(uuid, uuid, text) to authenticated;


drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all to authenticated
  using (
    private.has_permission(organization_id, 'products.manage')
    or private.is_team_admin(organization_id)
  )
  with check (
    private.has_permission(organization_id, 'products.manage')
    or private.is_team_admin(organization_id)
  );

drop policy if exists product_variants_write on public.product_variants;
create policy product_variants_write on public.product_variants
  for all to authenticated
  using (exists (
    select 1 from public.products product
    where product.id = product_id
      and (
        private.has_permission(product.organization_id, 'products.manage')
        or private.is_team_admin(product.organization_id)
      )
  ))
  with check (exists (
    select 1 from public.products product
    where product.id = product_id
      and (
        private.has_permission(product.organization_id, 'products.manage')
        or private.is_team_admin(product.organization_id)
      )
  ));

drop policy if exists product_inclusions_write on public.product_inclusions;
create policy product_inclusions_write on public.product_inclusions
  for all to authenticated
  using (exists (
    select 1 from public.products product
    where product.id = product_id
      and (
        private.has_permission(product.organization_id, 'products.manage')
        or private.is_team_admin(product.organization_id)
      )
  ))
  with check (exists (
    select 1 from public.products product
    where product.id = product_id
      and (
        private.has_permission(product.organization_id, 'products.manage')
        or private.is_team_admin(product.organization_id)
      )
  ));

drop policy if exists rate_plans_team_select on public.rate_plans;
create policy rate_plans_team_select on public.rate_plans
  for select to authenticated
  using (
    private.has_permission(organization_id, 'rates.manage')
    or private.has_permission(organization_id, 'rates.view')
    or private.is_team_admin(organization_id)
  );

drop policy if exists rate_plans_write on public.rate_plans;
create policy rate_plans_write on public.rate_plans
  for all to authenticated
  using (
    private.has_permission(organization_id, 'rates.manage')
    or private.is_team_admin(organization_id)
  )
  with check (
    private.has_permission(organization_id, 'rates.manage')
    or private.is_team_admin(organization_id)
  );

drop policy if exists rate_plan_items_select on public.rate_plan_items;
create policy rate_plan_items_select on public.rate_plan_items
  for select to authenticated
  using (exists (
    select 1 from public.rate_plans rate_plan
    where rate_plan.id = rate_plan_id
      and (
        private.has_permission(rate_plan.organization_id, 'rates.manage')
        or private.has_permission(rate_plan.organization_id, 'rates.view')
        or private.is_team_admin(rate_plan.organization_id)
        or exists (
          select 1 from public.agency_rate_assignments assignment
          join public.access_memberships membership on membership.id = assignment.membership_id
          where assignment.rate_plan_id = rate_plan.id
            and membership.user_id = (select auth.uid())
            and membership.access_type = 'agent'
            and membership.status = 'active'
        )
      )
  ));

drop policy if exists rate_plan_items_write on public.rate_plan_items;
create policy rate_plan_items_write on public.rate_plan_items
  for all to authenticated
  using (exists (
    select 1 from public.rate_plans rate_plan
    where rate_plan.id = rate_plan_id
      and (
        private.has_permission(rate_plan.organization_id, 'rates.manage')
        or private.is_team_admin(rate_plan.organization_id)
      )
  ))
  with check (exists (
    select 1 from public.rate_plans rate_plan
    where rate_plan.id = rate_plan_id
      and (
        private.has_permission(rate_plan.organization_id, 'rates.manage')
        or private.is_team_admin(rate_plan.organization_id)
      )
  ));

drop policy if exists agency_rate_assignments_select on public.agency_rate_assignments;
create policy agency_rate_assignments_select on public.agency_rate_assignments
  for select to authenticated
  using (
    private.has_permission(organization_id, 'rates.manage')
    or private.has_permission(organization_id, 'rates.view')
    or private.is_team_admin(organization_id)
    or exists (
      select 1 from public.access_memberships membership
      where membership.id = agency_rate_assignments.membership_id
        and membership.user_id = (select auth.uid())
        and membership.access_type = 'agent'
        and membership.status = 'active'
    )
  );

drop policy if exists agency_rate_assignments_write on public.agency_rate_assignments;
create policy agency_rate_assignments_write on public.agency_rate_assignments
  for all to authenticated
  using (
    private.has_permission(organization_id, 'rates.manage')
    or private.is_team_admin(organization_id)
  )
  with check (
    private.has_permission(organization_id, 'rates.manage')
    or private.is_team_admin(organization_id)
  );

create or replace function public.request_harold_handover(
  target_conversation_id uuid,
  requested_reason text default null,
  requested_domain text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  resolved_domain text;
begin
  resolved_domain := coalesce(nullif(trim(requested_domain), ''), 'general');
  if resolved_domain not in ('commercial', 'reservations', 'guest_relations', 'operations', 'general') then
    resolved_domain := 'general';
  end if;

  update public.harold_conversations
  set status = 'handover_requested',
      handover_requested_at = now(),
      handover_requested_by = 'user',
      handover_reason = nullif(trim(requested_reason), ''),
      handover_domain = resolved_domain,
      assigned_to_membership_id = null,
      resolved_at = null,
      updated_at = now()
  where id = target_conversation_id
    and user_id = (select auth.uid())
    and status = 'ai_active';

  if not found then
    raise exception 'Conversation cannot be handed over.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.claim_harold_handover(
  target_conversation_id uuid,
  target_membership_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_organization_id uuid;
  target_domain text;
begin
  select conversation.organization_id, conversation.handover_domain
    into target_organization_id, target_domain
  from public.harold_conversations conversation
  where conversation.id = target_conversation_id
    and conversation.status = 'handover_requested';

  if target_organization_id is null
    or not private.member_can_handle_handover(
      target_organization_id,
      target_membership_id,
      target_domain
    ) then
    raise exception 'Handover cannot be claimed by this team member.' using errcode = '42501';
  end if;

  update public.harold_conversations
  set status = 'human_active',
      assigned_to_membership_id = target_membership_id,
      updated_at = now()
  where id = target_conversation_id
    and status = 'handover_requested';

  if not found then
    raise exception 'Handover is no longer available.' using errcode = '40001';
  end if;
end;
$$;

create or replace function private.notify_harold_handover_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
begin
  if new.status = 'handover_requested' and old.status is distinct from new.status then
    for recipient in
      select membership.user_id
      from public.access_memberships membership
      where membership.organization_id = new.organization_id
        and membership.access_type = 'team'
        and membership.status = 'active'
        and private.member_can_handle_handover(
          new.organization_id,
          membership.id,
          new.handover_domain
        )
    loop
      perform private.push_notification(
        new.organization_id,
        recipient.user_id,
        'system',
        'Harold handover requested',
        coalesce(new.handover_reason, 'A conversation needs a qualified team member.'),
        '/team/communication/handovers',
        'harold_conversation',
        new.id::text,
        'harold-handover-request:' || new.id::text,
        jsonb_build_object('domain', new.handover_domain, 'sourceAccess', new.source_access)
      );
    end loop;
  elsif new.status = 'human_active' and old.status = 'handover_requested' then
    perform private.push_notification(
      new.organization_id,
      new.user_id,
      'system',
      'Harold handover claimed',
      'A Shearwater team member joined your conversation.',
      case new.source_access
        when 'agent' then '/agent/harold'
        when 'customer' then '/customer/chat'
        else '/team/harold'
      end,
      'harold_conversation',
      new.id::text,
      'harold-handover-claimed:' || new.id::text,
      jsonb_build_object('domain', new.handover_domain)
    );
  elsif new.status = 'resolved' and old.status is distinct from 'resolved' then
    perform private.push_notification(
      new.organization_id,
      new.user_id,
      'system',
      'Harold handover resolved',
      'Your conversation has been marked resolved.',
      case new.source_access
        when 'agent' then '/agent/harold'
        when 'customer' then '/customer/chat'
        else '/team/harold'
      end,
      'harold_conversation',
      new.id::text,
      'harold-handover-resolved:' || new.id::text,
      jsonb_build_object('domain', new.handover_domain)
    );
  end if;

  return new;
end;
$$;

grant execute on function public.request_harold_handover(uuid, text, text) to authenticated;
