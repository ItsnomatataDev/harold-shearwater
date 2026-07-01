alter table public.golden_dusk_agent_connections
  add column if not exists agent_full_name text;

comment on column public.golden_dusk_agent_connections.agent_full_name is
  'Agent display name mirrored from SWAIBMS / GoldenDusk after sign-in.';
