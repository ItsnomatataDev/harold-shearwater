
drop policy if exists membership_roles_insert_manager on public.membership_roles;
drop policy if exists membership_roles_update_manager on public.membership_roles;
drop policy if exists membership_roles_delete_manager on public.membership_roles;

create policy membership_roles_insert_manager on public.membership_roles
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.access_memberships m
      where m.id = membership_id
        and private.has_permission(m.organization_id, 'roles.manage')
    )
  );

create policy membership_roles_update_manager on public.membership_roles
  for update to authenticated
  using (
    exists (
      select 1
      from public.access_memberships m
      where m.id = membership_id
        and private.has_permission(m.organization_id, 'roles.manage')
    )
  )
  with check (
    exists (
      select 1
      from public.access_memberships m
      where m.id = membership_id
        and private.has_permission(m.organization_id, 'roles.manage')
    )
  );

create policy membership_roles_delete_manager on public.membership_roles
  for delete to authenticated
  using (
    exists (
      select 1
      from public.access_memberships m
      where m.id = membership_id
        and private.has_permission(m.organization_id, 'roles.manage')
    )
  );
