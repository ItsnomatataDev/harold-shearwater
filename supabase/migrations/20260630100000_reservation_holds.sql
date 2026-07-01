alter table public.agent_enquiries
  add column if not exists hold_expires_at timestamptz;

alter table public.agent_enquiries
  drop constraint if exists agent_enquiries_status_check;

alter table public.agent_enquiries
  add constraint agent_enquiries_status_check
  check (status in (
    'new',
    'qualifying',
    'quote_requested',
    'quoted',
    'reservation_requested',
    'on_hold',
    'confirmed',
    'complete',
    'cancelled'
  ));

alter table public.booking_requests
  add column if not exists hold_expires_at timestamptz;

alter table public.booking_requests
  drop constraint if exists booking_requests_status_check;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('new', 'reviewing', 'on_hold', 'confirmed', 'cancelled'));

create index if not exists agent_enquiries_hold_expires_idx
  on public.agent_enquiries (hold_expires_at)
  where status = 'on_hold' and hold_expires_at is not null;

create index if not exists booking_requests_hold_expires_idx
  on public.booking_requests (hold_expires_at)
  where status = 'on_hold' and hold_expires_at is not null;
