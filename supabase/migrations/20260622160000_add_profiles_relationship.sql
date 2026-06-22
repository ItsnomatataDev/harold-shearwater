
alter table public.access_memberships
add constraint fk_access_memberships_user_profiles
foreign key (user_id) references public.profiles(id) on delete cascade;


alter table public.tasks
add constraint fk_tasks_created_by_profiles
foreign key (created_by) references public.profiles(id) on delete restrict;

alter table public.tasks
add constraint fk_tasks_assigned_to_profiles
foreign key (assigned_to) references public.profiles(id) on delete set null;


alter table public.documents
add constraint fk_documents_created_by_profiles
foreign key (created_by) references public.profiles(id) on delete restrict;

alter table public.audit_logs
add constraint fk_audit_logs_actor_profiles
foreign key (actor_user_id) references public.profiles(id) on delete set null;

alter table public.profiles enable row level security;

create policy "view_org_profiles" on public.profiles
  for select using (
    exists (
      select 1 from public.access_memberships am
      where am.user_id = profiles.id
      and am.organization_id = (
        select organization_id from public.access_memberships
        where user_id = auth.uid() and access_type = 'team'
      )
      and am.access_type = 'team'
      and am.status in ('active', 'invited')
    )
  );

create policy "update_own_profile" on public.profiles
  for update using (id = auth.uid());


create policy "insert_own_profile" on public.profiles
  for insert with check (id = auth.uid());
