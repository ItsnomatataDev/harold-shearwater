create policy products_customer_read on public.products
  for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.organizations org
      where org.id = products.organization_id
        and org.type = 'shearwater'
    )
  );

create policy product_variants_customer_read on public.product_variants
  for select to authenticated
  using (
    active
    and exists (
      select 1
      from public.products p
      join public.organizations org on org.id = p.organization_id
      where p.id = product_variants.product_id
        and p.status = 'active'
        and org.type = 'shearwater'
    )
  );

create policy product_inclusions_customer_read on public.product_inclusions
  for select to authenticated
  using (
    exists (
      select 1
      from public.products p
      join public.organizations org on org.id = p.organization_id
      where p.id = product_inclusions.product_id
        and p.status = 'active'
        and org.type = 'shearwater'
    )
  );
