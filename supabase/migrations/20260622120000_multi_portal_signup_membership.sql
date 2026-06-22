create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  portal_access text := lower(coalesce(new.raw_user_meta_data ->> 'portal_access', 'customer'));
  membership_id uuid;
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  ) on conflict (id) do nothing;

  if portal_access = 'team' then
    insert into public.access_memberships (user_id, organization_id, access_type, status, primary_location_id, joined_at)
    values (
      new.id,
      '00000000-0000-4000-8000-000000000001',
      'team',
      'active',
      '00000000-0000-4000-8000-000000000101',
      now()
    )
    on conflict do nothing
    returning id into membership_id;

    if membership_id is null then
      select id
      into membership_id
      from public.access_memberships
      where user_id = new.id
        and organization_id = '00000000-0000-4000-8000-000000000001'
        and access_type = 'team'
      limit 1;
    end if;

    if membership_id is not null then
      insert into public.membership_roles (membership_id, role_id, assigned_by)
      values (membership_id, '00000000-0000-4000-8000-000000000202', new.id)
      on conflict do nothing;
    end if;
  elsif portal_access = 'agent' then
    insert into public.access_memberships (user_id, organization_id, access_type, status, joined_at)
    values (
      new.id,
      '00000000-0000-4000-8000-000000000001',
      'agent',
      'active',
      now()
    )
    on conflict do nothing;
  else
    insert into public.access_memberships (user_id, access_type, status, joined_at)
    values (new.id, 'customer', 'active', now())
    on conflict do nothing;
  end if;

  return new;
end;
$$;
