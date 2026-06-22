drop policy if exists audit_insert_member on public.audit_logs;

create policy audit_insert_member on public.audit_logs
  for insert to authenticated
  with check (
    organization_id is not null
    and actor_user_id = (select auth.uid())
    and private.is_org_member(organization_id)
  );
