
drop policy if exists memberships_update_manager on public.access_memberships;

create policy memberships_update_manager on public.access_memberships
  for update to authenticated
  using (private.has_permission(organization_id, 'members.manage'))
  with check (private.has_permission(organization_id, 'members.manage'));



drop policy if exists invitations_insert_manager on public.invitations;

create policy invitations_insert_manager on public.invitations
  for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and private.has_permission(organization_id, 'members.manage')
  );



drop policy if exists tasks_delete_manager on public.tasks;

create policy tasks_delete_manager on public.tasks
  for delete to authenticated
  using (private.has_permission(organization_id, 'tasks.manage'));
