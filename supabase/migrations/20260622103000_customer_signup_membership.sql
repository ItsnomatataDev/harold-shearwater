create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    coalesce(new.email, ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), '')
  ) on conflict (id) do nothing;

  if new.raw_user_meta_data ->> 'portal_access' = 'customer' then
    insert into public.access_memberships (user_id, access_type, status, joined_at)
    values (new.id, 'customer', 'active', now())
    on conflict do nothing;
  end if;

  return new;
end;
$$;
