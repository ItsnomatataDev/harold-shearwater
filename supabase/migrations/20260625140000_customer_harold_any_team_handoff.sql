create or replace function private.member_can_handle_handover(
  target_organization_id uuid,
  target_membership_id uuid,
  target_domain text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  required_permissions text[];
  required_permission text;
begin
  if not exists (
    select 1
    from public.access_memberships membership
    where membership.id = target_membership_id
      and membership.organization_id = target_organization_id
      and membership.access_type = 'team'
      and membership.status = 'active'
  ) then
    return false;
  end if;


  if coalesce(target_domain, 'general') = 'guest_relations' then
    return true;
  end if;

  required_permissions := case coalesce(target_domain, 'general')
    when 'commercial' then array['products.view', 'rates.view']
    when 'reservations' then array['schedules.manage', 'tasks.manage']
    when 'operations' then array['tasks.manage', 'schedules.manage']
    else array['harold.handovers.manage']
  end;

  foreach required_permission in array required_permissions loop
    if private.membership_has_permission(target_membership_id, required_permission) then
      return true;
    end if;
  end loop;

  return false;
end;
$$;

create or replace function private.notify_harold_handover_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
  customer_href text;
begin
  customer_href := case
    when new.chat_conversation_id is not null
      then '/customer/messages?conversation=' || new.chat_conversation_id::text
    else '/customer/chat'
  end;

  if new.status = 'handover_requested' and old.status is distinct from new.status then
    for recipient in
      select membership.user_id
      from public.access_memberships membership
      where membership.organization_id = new.organization_id
        and membership.access_type = 'team'
        and membership.status = 'active'
        and private.member_can_handle_handover(
          new.organization_id,
          membership.id,
          new.handover_domain
        )
    loop
      perform private.push_notification(
        recipient.user_id,
        new.organization_id,
        'system',
        case
          when new.source_access = 'customer' then 'Guest needs assistance'
          else 'Harold handover requested'
        end,
        coalesce(new.handover_reason, 'A conversation needs a team member.'),
        '/team/communication/handovers',
        'harold_conversation',
        new.id::text,
        'harold-handover-request:' || new.id::text,
        jsonb_build_object('domain', new.handover_domain, 'sourceAccess', new.source_access)
      );
    end loop;
  elsif new.status = 'human_active' and old.status = 'handover_requested' then
    perform private.push_notification(
      new.user_id,
      new.organization_id,
      'system',
      'A team member joined your conversation',
      'Continue in Messages to chat with your Shearwater assistant.',
      case new.source_access
        when 'agent' then '/agent/harold'
        when 'customer' then customer_href
        else '/team/harold'
      end,
      'harold_conversation',
      new.id::text,
      'harold-handover-claimed:' || new.id::text,
      jsonb_build_object('domain', new.handover_domain, 'chatConversationId', new.chat_conversation_id)
    );
  elsif new.status = 'resolved' and old.status is distinct from 'resolved' then
    perform private.push_notification(
      new.user_id,
      new.organization_id,
      'system',
      'Harold conversation resolved',
      'Your conversation has been marked resolved.',
      case new.source_access
        when 'agent' then '/agent/harold'
        when 'customer' then customer_href
        else '/team/harold'
      end,
      'harold_conversation',
      new.id::text,
      'harold-handover-resolved:' || new.id::text,
      jsonb_build_object('domain', new.handover_domain)
    );
  end if;

  return new;
end;
$$;

create or replace function private.notify_harold_human_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  conversation_row public.harold_conversations%rowtype;
  target_href text;
begin
  if new.role <> 'human' then
    return new;
  end if;

  select * into conversation_row
  from public.harold_conversations
  where id = new.conversation_id;

  target_href := case conversation_row.source_access
    when 'agent' then '/agent/harold'
    when 'customer' then
      case
        when conversation_row.chat_conversation_id is not null
          then '/customer/messages?conversation=' || conversation_row.chat_conversation_id::text
        else '/customer/chat'
      end
    else '/team/harold'
  end;

  perform private.push_notification(
    conversation_row.user_id,
    conversation_row.organization_id,
    'system',
   'New reply from Shearwater',
    left(new.content, 180),
    target_href,
    'harold_messages',
    new.id::text,
    'harold-human-message:' || new.id::text,
    jsonb_build_object('conversationId', new.conversation_id, 'messageId', new.id)
  );
  return new;
end;
$$;