create table if not exists public.key_account_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_membership_id uuid not null references public.access_memberships(id) on delete cascade,
  team_membership_id uuid not null references public.access_memberships(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  assigned_at timestamptz not null default now(),
  active boolean not null default true,
  unique (organization_id, partner_membership_id)
);

create index if not exists key_account_assignments_team_idx
  on public.key_account_assignments (team_membership_id)
  where active;

alter table public.key_account_assignments enable row level security;

create policy key_account_assignments_select_team on public.key_account_assignments
  for select to authenticated
  using (private.is_team_member(organization_id));

create policy key_account_assignments_write_team on public.key_account_assignments
  for all to authenticated
  using (
    private.has_permission(organization_id, 'members.manage')
    or private.is_team_admin(organization_id)
  )
  with check (
    private.has_permission(organization_id, 'members.manage')
    or private.is_team_admin(organization_id)
  );

alter table public.harold_conversations
  add column if not exists key_account_team_membership_id uuid
    references public.access_memberships(id) on delete set null;

create or replace function private.resolve_key_account_team_membership_id(
  target_organization_id uuid,
  requester_user_id uuid,
  source_access text
)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  partner_membership_id uuid;
  assistant_membership_id uuid;
begin
  if requester_user_id is null then
    return null;
  end if;

  if source_access = 'agent' then
    select membership.id
    into partner_membership_id
    from public.access_memberships membership
    where membership.user_id = requester_user_id
      and membership.access_type = 'agent'
      and membership.status = 'active'
    order by membership.joined_at desc nulls last, membership.created_at desc
    limit 1;
  elsif source_access = 'customer' then
    select membership.id
    into partner_membership_id
    from public.access_memberships membership
    where membership.user_id = requester_user_id
      and membership.access_type = 'customer'
      and membership.status = 'active'
    order by membership.created_at desc
    limit 1;
  else
    return null;
  end if;

  if partner_membership_id is null then
    return null;
  end if;

  select assignment.team_membership_id
  into assistant_membership_id
  from public.key_account_assignments assignment
  where assignment.organization_id = target_organization_id
    and assignment.partner_membership_id = partner_membership_id
    and assignment.active = true
  limit 1;

  return assistant_membership_id;
end;
$$;

revoke all on function private.resolve_key_account_team_membership_id(uuid, uuid, text) from public;
grant execute on function private.resolve_key_account_team_membership_id(uuid, uuid, text) to authenticated;

create or replace function private.assign_key_account_on_handover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'handover_requested'
    and old.status is distinct from new.status
    and new.key_account_team_membership_id is null then
    new.key_account_team_membership_id := private.resolve_key_account_team_membership_id(
      new.organization_id,
      new.user_id,
      new.source_access
    );
  end if;
  return new;
end;
$$;

drop trigger if exists harold_conversation_assign_key_account on public.harold_conversations;
create trigger harold_conversation_assign_key_account
  before update of status on public.harold_conversations
  for each row execute function private.assign_key_account_on_handover();

create or replace function private.notify_harold_handover_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient record;
  customer_href text;
  key_account_user_id uuid;
  requester_name text;
  handover_href text;
begin
  customer_href := case
    when new.chat_conversation_id is not null
      then '/customer/messages?conversation=' || new.chat_conversation_id::text
    else '/customer/chat'
  end;

  handover_href := '/team/communication/handovers?handover=' || new.id::text;

  if new.status = 'handover_requested' and old.status is distinct from new.status then
    select coalesce(
      nullif(trim(concat(profile.first_name, ' ', profile.last_name)), ''),
      profile.email,
      'Contact'
    )
    into requester_name
    from public.profiles profile
    where profile.id = new.user_id;

    if new.key_account_team_membership_id is not null then
      select membership.user_id
      into key_account_user_id
      from public.access_memberships membership
      where membership.id = new.key_account_team_membership_id;

      if key_account_user_id is not null then
        perform private.push_notification(
          key_account_user_id,
          new.organization_id,
          'system',
          case new.source_access
            when 'agent' then 'Key account · travel partner needs you'
            when 'customer' then 'Key account · guest needs assistance'
            else 'Key account · Harold handover'
          end,
          requester_name || ' — ' || coalesce(new.handover_reason, new.title, 'Harold escalated this conversation.'),
          handover_href,
          'harold_conversation',
          new.id::text,
          'harold-handover-key-account:' || new.id::text,
          jsonb_build_object(
            'domain', new.handover_domain,
            'sourceAccess', new.source_access,
            'priority', 'key_account',
            'requesterName', requester_name
          )
        );
      end if;
    end if;

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
        and (
          key_account_user_id is null
          or membership.user_id is distinct from key_account_user_id
        )
    loop
      perform private.push_notification(
        recipient.user_id,
        new.organization_id,
        'system',
        case
          when new.source_access = 'customer' then 'Guest handover in queue'
          when new.source_access = 'agent' then 'Agent handover in queue'
          else 'Harold handover in queue'
        end,
        requester_name || ' · ' || coalesce(new.handover_reason, 'Needs a qualified team member.'),
        handover_href,
        'harold_conversation',
        new.id::text,
        'harold-handover-request:' || new.id::text || ':' || recipient.user_id::text,
        jsonb_build_object(
          'domain', new.handover_domain,
          'sourceAccess', new.source_access,
          'requesterName', requester_name
        )
      );
    end loop;
  elsif new.status = 'human_active' and old.status = 'handover_requested' then
    perform private.push_notification(
      new.user_id,
      new.organization_id,
      'system',
      'A Shearwater specialist joined your conversation',
      'Your key account assistant is now helping you. Continue in Messages.',
      case new.source_access
        when 'agent' then '/agent/harold'
        when 'customer' then customer_href
        else '/team/harold'
      end,
      'harold_conversation',
      new.id::text,
      'harold-handover-claimed:' || new.id::text,
      jsonb_build_object(
        'domain', new.handover_domain,
        'chatConversationId', new.chat_conversation_id
      )
    );
  elsif new.status = 'resolved' and old.status is distinct from 'resolved' then
    perform private.push_notification(
      new.user_id,
      new.organization_id,
      'system',
      'Conversation resolved',
      'Your Shearwater conversation has been marked complete.',
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
