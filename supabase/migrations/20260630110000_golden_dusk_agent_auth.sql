create table if not exists public.golden_dusk_agent_auth_challenges (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.access_memberships(id) on delete cascade,
  challenge_token text not null,
  factors text[] not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists golden_dusk_agent_auth_challenges_membership_idx
  on public.golden_dusk_agent_auth_challenges (membership_id, expires_at desc);

create table if not exists public.golden_dusk_agent_connections (
  membership_id uuid primary key references public.access_memberships(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  golden_dusk_account_id int not null,
  golden_dusk_agency_id int not null,
  golden_dusk_consultant_id int,
  connected_email text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz not null,
  agency_name text,
  consultant_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists golden_dusk_agent_connections_org_idx
  on public.golden_dusk_agent_connections (organization_id);

create trigger golden_dusk_agent_connections_updated_at
  before update on public.golden_dusk_agent_connections
  for each row execute function public.set_updated_at();

alter table public.golden_dusk_agent_auth_challenges enable row level security;
alter table public.golden_dusk_agent_connections enable row level security;

