create or replace function private.notify_agent_access_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.access_type <> 'agent' or new.organization_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  perform private.push_notification(
    new.user_id,
    new.organization_id,
    'access',
    case new.status
      when 'active' then 'Agent Access activated'
      when 'suspended' then 'Agent Access suspended'
      else 'Agent Access updated'
    end,
    case new.status
      when 'active' then 'Your Shearwater Agent Access membership is active.'
      when 'suspended' then 'Your Shearwater Agent Access membership has been suspended.'
      else 'Your Agent Access membership status changed.'
    end,
    '/agent/settings',
    'access_memberships',
    new.id::text,
    'agent-membership-status:' || new.id::text || ':' || new.status::text,
    jsonb_build_object('membershipId', new.id, 'status', new.status)
  );
  return new;
end;
$$;

drop trigger if exists agent_access_changed_notification on public.access_memberships;
create trigger agent_access_changed_notification
  after insert or update of status on public.access_memberships
  for each row execute function private.notify_agent_access_changed();

create or replace function private.notify_agent_rate_assignment_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment public.agency_rate_assignments%rowtype;
  recipient uuid;
  plan_name text;
begin
  if tg_op = 'DELETE' then
    assignment := old;
  else
    assignment := new;
  end if;

  select membership.user_id
    into recipient
  from public.access_memberships membership
  where membership.id = assignment.membership_id
    and membership.access_type = 'agent';

  select rate_plan.name
    into plan_name
  from public.rate_plans rate_plan
  where rate_plan.id = assignment.rate_plan_id;

  if recipient is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  perform private.push_notification(
    recipient,
    assignment.organization_id,
    'access',
    case when tg_op = 'INSERT' then 'Rate plan assigned' else 'Rate plan removed' end,
    case when tg_op = 'INSERT'
      then coalesce(plan_name, 'A rate plan') || ' is now available to your agency.'
      else coalesce(plan_name, 'A rate plan') || ' is no longer assigned to your agency.'
    end,
    '/agent/products',
    'rate_plans',
    assignment.rate_plan_id::text,
    'agent-rate-assignment:' || assignment.id::text || ':' || lower(tg_op),
    jsonb_build_object('ratePlanId', assignment.rate_plan_id, 'operation', tg_op)
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists agent_rate_assignment_notification on public.agency_rate_assignments;
create trigger agent_rate_assignment_notification
  after insert or delete on public.agency_rate_assignments
  for each row execute function private.notify_agent_rate_assignment_changed();

create or replace function private.notify_agent_enquiry_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  notification_title text;
  notification_body text;
begin
  if new.membership_id is null then
    return new;
  end if;

  if new.status is not distinct from old.status
    and new.quote_amount is not distinct from old.quote_amount
    and new.external_booking_reference is not distinct from old.external_booking_reference then
    return new;
  end if;

  select membership.user_id
    into recipient
  from public.access_memberships membership
  where membership.id = new.membership_id
    and membership.access_type = 'agent';

  if recipient is null or recipient = (select auth.uid()) then
    return new;
  end if;

  if new.status is distinct from old.status then
    notification_title := 'Enquiry status updated';
    notification_body := coalesce(new.reference, 'Your enquiry') || ' is now ' || replace(new.status, '_', ' ') || '.';
  elsif new.quote_amount is distinct from old.quote_amount then
    notification_title := 'Quote updated';
    notification_body := coalesce(new.reference, 'Your enquiry') || ' has new pricing information.';
  else
    notification_title := 'Booking reference updated';
    notification_body := coalesce(new.reference, 'Your enquiry') || ' has a booking reference update.';
  end if;

  perform private.push_notification(
    recipient,
    new.organization_id,
    'system',
    notification_title,
    notification_body,
    '/agent/enquiries/' || new.id::text,
    'agent_enquiries',
    new.id::text,
    null,
    jsonb_build_object('enquiryId', new.id, 'status', new.status)
  );

  return new;
end;
$$;

drop trigger if exists agent_enquiry_changed_notification on public.agent_enquiries;
create trigger agent_enquiry_changed_notification
  after update of status, quote_amount, external_booking_reference on public.agent_enquiries
  for each row execute function private.notify_agent_enquiry_changed();

create or replace function private.notify_agent_inbox_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  thread_row public.inbox_threads%rowtype;
  recipient uuid;
  sender_user_id uuid;
begin
  select * into thread_row
  from public.inbox_threads
  where id = new.thread_id;

  select membership.user_id into recipient
  from public.access_memberships membership
  where membership.id = thread_row.membership_id
    and membership.access_type = 'agent';

  if new.sender_id is not null then
    select membership.user_id into sender_user_id
    from public.access_memberships membership
    where membership.id = new.sender_id;
  end if;

  if recipient is null or recipient is not distinct from sender_user_id then
    return new;
  end if;

  perform private.push_notification(
    recipient,
    new.organization_id,
    'system',
    'New inbox message',
    coalesce(thread_row.subject, 'You received a new message.'),
    '/agent/inbox',
    'inbox_threads',
    thread_row.id::text,
    'agent-inbox-message:' || new.id::text,
    jsonb_build_object('threadId', thread_row.id, 'messageId', new.id)
  );

  return new;
end;
$$;

drop trigger if exists agent_inbox_message_notification on public.inbox_messages;
create trigger agent_inbox_message_notification
  after insert on public.inbox_messages
  for each row execute function private.notify_agent_inbox_message();
