
create index if not exists access_memberships_org_access_created_idx
  on public.access_memberships (organization_id, access_type, created_at desc);

create index if not exists roles_org_access_idx
  on public.roles (organization_id, access_type);

create index if not exists tasks_org_status_due_idx
  on public.tasks (organization_id, status, due_at);

create index if not exists audit_logs_org_actor_created_idx
  on public.audit_logs (organization_id, actor_user_id, created_at desc);

create index if not exists documents_org_published_idx
  on public.documents (organization_id, published_at desc)
  where status = 'published';
