alter table public.agent_enquiries
  add column if not exists golden_dusk_booking_id integer,
  add column if not exists golden_dusk_reservation_status text,
  add column if not exists golden_dusk_payment_status text,
  add column if not exists golden_dusk_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists golden_dusk_synced_at timestamptz;

create index if not exists agent_enquiries_golden_dusk_booking_idx
  on public.agent_enquiries (golden_dusk_booking_id)
  where golden_dusk_booking_id is not null;

create or replace function private.notify_team_golden_dusk_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  notification_title text;
  notification_body text;
  dedupe text;
begin
  if new.golden_dusk_booking_id is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    notification_title := 'GoldenDusk booking confirmed';
    notification_body :=
      coalesce(new.reference, 'Agent enquiry')
      || ' · SWAIBMS #'
      || new.golden_dusk_booking_id::text
      || coalesce(' · ' || new.contact_name, '');
    dedupe := 'golden-dusk-booking-created:' || new.id::text;
  elsif tg_op = 'UPDATE' then
    if new.golden_dusk_booking_id is not distinct from old.golden_dusk_booking_id
      and new.golden_dusk_reservation_status is not distinct from old.golden_dusk_reservation_status
      and new.golden_dusk_payment_status is not distinct from old.golden_dusk_payment_status
      and new.status is not distinct from old.status then
      return new;
    end if;

    if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      notification_title := 'GoldenDusk booking cancelled';
      notification_body :=
        coalesce(new.reference, 'Agent enquiry')
        || ' · SWAIBMS #'
        || new.golden_dusk_booking_id::text;
      dedupe := 'golden-dusk-booking-cancelled:' || new.id::text;
    elsif new.golden_dusk_booking_id is distinct from old.golden_dusk_booking_id then
      notification_title := 'GoldenDusk booking confirmed';
      notification_body :=
        coalesce(new.reference, 'Agent enquiry')
        || ' · SWAIBMS #'
        || new.golden_dusk_booking_id::text;
      dedupe := 'golden-dusk-booking-created:' || new.id::text;
    elsif new.golden_dusk_reservation_status is distinct from old.golden_dusk_reservation_status
      or new.golden_dusk_payment_status is distinct from old.golden_dusk_payment_status then
      notification_title := 'GoldenDusk booking updated';
      notification_body :=
        coalesce(new.reference, 'Agent enquiry')
        || ' · SWAIBMS #'
        || new.golden_dusk_booking_id::text
        || coalesce(' · ' || new.golden_dusk_reservation_status, '');
      dedupe :=
        'golden-dusk-booking-status:'
        || new.id::text
        || ':'
        || coalesce(new.golden_dusk_reservation_status, '')
        || ':'
        || coalesce(new.golden_dusk_payment_status, '');
    else
      return new;
    end if;
  else
    return new;
  end if;

  for recipient in
    select membership.user_id
    from public.access_memberships membership
    where membership.organization_id = new.organization_id
      and membership.access_type = 'team'
      and membership.status = 'active'
  loop
    perform private.push_notification(
      recipient,
      new.organization_id,
      'system',
      notification_title,
      notification_body,
      '/team/bookings/enquiries/' || new.id::text,
      'agent_enquiries',
      new.id::text,
      dedupe,
      jsonb_build_object(
        'enquiryId', new.id,
        'goldenDuskBookingId', new.golden_dusk_booking_id,
        'reservationStatus', new.golden_dusk_reservation_status,
        'paymentStatus', new.golden_dusk_payment_status
      )
    );
  end loop;

  return new;
end;
$$;

drop trigger if exists agent_enquiry_golden_dusk_notification on public.agent_enquiries;
create trigger agent_enquiry_golden_dusk_notification
  after insert or update of golden_dusk_booking_id, golden_dusk_reservation_status, golden_dusk_payment_status, status
  on public.agent_enquiries
  for each row execute function private.notify_team_golden_dusk_booking();
