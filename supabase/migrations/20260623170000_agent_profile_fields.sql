alter table public.profiles
  add column if not exists agency_name text,
  add column if not exists website    text;
