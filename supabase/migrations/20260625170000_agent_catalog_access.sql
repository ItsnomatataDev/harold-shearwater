create policy products_agent_read on public.products
  for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.organizations org
      where org.id = products.organization_id
        and org.type = 'shearwater'
    )
    and exists (
      select 1
      from public.access_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.access_type = 'agent'
        and membership.status = 'active'
    )
  );

create policy product_variants_agent_read on public.product_variants
  for select to authenticated
  using (
    active
    and exists (
      select 1
      from public.products product
      join public.organizations org on org.id = product.organization_id
      where product.id = product_variants.product_id
        and product.status = 'active'
        and org.type = 'shearwater'
    )
    and exists (
      select 1
      from public.access_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.access_type = 'agent'
        and membership.status = 'active'
    )
  );

create policy product_inclusions_agent_read on public.product_inclusions
  for select to authenticated
  using (
    exists (
      select 1
      from public.products product
      join public.organizations org on org.id = product.organization_id
      where product.id = product_inclusions.product_id
        and product.status = 'active'
        and org.type = 'shearwater'
    )
    and exists (
      select 1
      from public.access_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.access_type = 'agent'
        and membership.status = 'active'
    )
  );

create policy reviews_agent_read on public.reviews
  for select to authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.organizations org
      where org.id = reviews.organization_id
        and org.type = 'shearwater'
    )
    and exists (
      select 1
      from public.access_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.access_type = 'agent'
        and membership.status = 'active'
    )
  );

drop policy if exists rate_plans_agent_select on public.rate_plans;
create policy rate_plans_agent_select on public.rate_plans
  for select to authenticated
  using (
    active
    and exists (
      select 1
      from public.organizations org
      where org.id = rate_plans.organization_id
        and org.type = 'shearwater'
    )
    and exists (
      select 1
      from public.access_memberships membership
      where membership.user_id = (select auth.uid())
        and membership.access_type = 'agent'
        and membership.status = 'active'
    )
    and (
      rate_plans.plan_type = 'agent_default'
      or exists (
        select 1
        from public.agency_rate_assignments assignment
        join public.access_memberships agent_membership
          on agent_membership.id = assignment.membership_id
        where assignment.rate_plan_id = rate_plans.id
          and agent_membership.user_id = (select auth.uid())
          and agent_membership.access_type = 'agent'
          and agent_membership.status = 'active'
      )
    )
  );

drop policy if exists rate_plan_items_select on public.rate_plan_items;
create policy rate_plan_items_select on public.rate_plan_items
  for select to authenticated
  using (exists (
    select 1
    from public.rate_plans rate_plan
    where rate_plan.id = rate_plan_items.rate_plan_id
      and (
        private.has_permission(rate_plan.organization_id, 'rates.manage')
        or private.has_permission(rate_plan.organization_id, 'rates.view')
        or private.is_team_admin(rate_plan.organization_id)
        or (
          rate_plan.active
          and exists (
            select 1
            from public.organizations org
            where org.id = rate_plan.organization_id
              and org.type = 'shearwater'
          )
          and exists (
            select 1
            from public.access_memberships membership
            where membership.user_id = (select auth.uid())
              and membership.access_type = 'agent'
              and membership.status = 'active'
          )
          and (
            rate_plan.plan_type = 'agent_default'
            or exists (
              select 1
              from public.agency_rate_assignments assignment
              join public.access_memberships agent_membership
                on agent_membership.id = assignment.membership_id
              where assignment.rate_plan_id = rate_plan.id
                and agent_membership.user_id = (select auth.uid())
                and agent_membership.access_type = 'agent'
                and agent_membership.status = 'active'
            )
          )
        )
      )
  ));
