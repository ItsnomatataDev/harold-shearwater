
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  )
  on conflict (id) do nothing;

  if lower(coalesce(new.raw_user_meta_data ->> 'portal_access', '')) = 'customer' then
    insert into public.access_memberships (user_id, access_type, status, joined_at)
    values (new.id, 'customer', 'active', now())
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop policy if exists "view_org_profiles" on public.profiles;

revoke all on function public.has_permission(uuid, text) from public;
revoke all on function public.has_permission(uuid, text) from anon;
grant execute on function public.has_permission(uuid, text) to authenticated;

drop policy if exists shift_templates_manage on public.shift_templates;
create policy shift_templates_insert_manager on public.shift_templates
for insert to authenticated
with check (
created_by = (select auth.uid())
and private.has_permission(organization_id, 'schedules.manage')
  );
create policy shift_templates_update_manager on public.shift_templates
for update to authenticated
using (private.has_permission(organization_id, 'schedules.manage'))
with check (private.has_permission(organization_id, 'schedules.manage'));
create policy shift_templates_delete_manager on public.shift_templates
for delete to authenticated
using (private.has_permission(organization_id, 'schedules.manage'));
