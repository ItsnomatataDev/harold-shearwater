create or replace function private.is_team_admin(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.access_memberships membership
    join public.membership_roles membership_role
      on membership_role.membership_id = membership.id
    join public.roles role
      on role.id = membership_role.role_id
    where membership.user_id = (select auth.uid())
      and membership.organization_id = target_organization_id
      and membership.access_type = 'team'
      and membership.status = 'active'
      and role.key = 'team_admin'
      and role.access_type = 'team'
  );
$$;

revoke all on function private.is_team_admin(uuid) from public;
grant execute on function private.is_team_admin(uuid) to authenticated;

drop policy if exists products_write on public.products;
create policy products_write on public.products
  for all to authenticated
  using (private.is_team_admin(organization_id))
  with check (private.is_team_admin(organization_id));

drop policy if exists product_variants_write on public.product_variants;
create policy product_variants_write on public.product_variants
  for all to authenticated
  using (exists (
    select 1
    from public.products product
    where product.id = product_id
      and private.is_team_admin(product.organization_id)
  ))
  with check (exists (
    select 1
    from public.products product
    where product.id = product_id
      and private.is_team_admin(product.organization_id)
  ));

drop policy if exists product_inclusions_write on public.product_inclusions;
create policy product_inclusions_write on public.product_inclusions
  for all to authenticated
  using (exists (
    select 1
    from public.products product
    where product.id = product_id
      and private.is_team_admin(product.organization_id)
  ))
  with check (exists (
    select 1
    from public.products product
    where product.id = product_id
      and private.is_team_admin(product.organization_id)
  ));

drop policy if exists rate_plans_team_select on public.rate_plans;
create policy rate_plans_team_select on public.rate_plans
  for select to authenticated
  using (private.is_team_admin(organization_id));

drop policy if exists rate_plans_write on public.rate_plans;
create policy rate_plans_write on public.rate_plans
  for all to authenticated
  using (private.is_team_admin(organization_id))
  with check (private.is_team_admin(organization_id));

drop policy if exists rate_plan_items_select on public.rate_plan_items;
create policy rate_plan_items_select on public.rate_plan_items
  for select to authenticated
  using (exists (
    select 1
    from public.rate_plans rate_plan
    where rate_plan.id = rate_plan_id
      and (
        private.is_team_admin(rate_plan.organization_id)
        or exists (
          select 1
          from public.agency_rate_assignments assignment
          join public.access_memberships membership
            on membership.id = assignment.membership_id
          where assignment.rate_plan_id = rate_plan.id
            and membership.user_id = auth.uid()
            and membership.access_type = 'agent'
            and membership.status = 'active'
        )
      )
  ));

drop policy if exists rate_plan_items_write on public.rate_plan_items;
create policy rate_plan_items_write on public.rate_plan_items
  for all to authenticated
  using (exists (
    select 1
    from public.rate_plans rate_plan
    where rate_plan.id = rate_plan_id
      and private.is_team_admin(rate_plan.organization_id)
  ))
  with check (exists (
    select 1
    from public.rate_plans rate_plan
    where rate_plan.id = rate_plan_id
      and private.is_team_admin(rate_plan.organization_id)
  ));

drop policy if exists agency_rate_select on public.agency_rate_assignments;
create policy agency_rate_select on public.agency_rate_assignments
  for select to authenticated
  using (
    private.is_team_admin(organization_id)
    or exists (
      select 1
      from public.access_memberships membership
      where membership.id = membership_id
        and membership.user_id = auth.uid()
        and membership.access_type = 'agent'
        and membership.status = 'active'
    )
  );

drop policy if exists agency_rate_write on public.agency_rate_assignments;
create policy agency_rate_write on public.agency_rate_assignments
  for all to authenticated
  using (private.is_team_admin(organization_id))
  with check (private.is_team_admin(organization_id));
