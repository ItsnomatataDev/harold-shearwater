create or replace function public.accept_team_invitation_by_id(p_invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_row public.invitations%rowtype;
  current_user_id uuid := (select auth.uid());
  current_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  accepted_membership_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication is required.' using errcode = '42501';
  end if;

  select * into invitation_row
  from public.invitations i
  where i.id = p_invitation_id
    and i.access_type = 'team'
    and i.accepted_at is null
    and i.expires_at > now()
  for update;

  if invitation_row.id is null then
    raise exception 'This invitation is invalid or has expired.' using errcode = 'P0002';
  end if;

  if lower(invitation_row.email) <> current_email then
    raise exception 'Sign in with the email address that was invited.' using errcode = '42501';
  end if;

  insert into public.access_memberships (
    user_id, organization_id, access_type, status, invited_by, joined_at
  ) values (
    current_user_id, invitation_row.organization_id, 'team', 'active', invitation_row.invited_by, now()
  )
  on conflict (user_id, organization_id, access_type) where organization_id is not null
  do update set status = 'active', invited_by = excluded.invited_by,
    joined_at = coalesce(public.access_memberships.joined_at, now()), updated_at = now()
  returning id into accepted_membership_id;

  if invitation_row.role_id is not null then
    insert into public.membership_roles (membership_id, role_id, assigned_by)
    values (accepted_membership_id, invitation_row.role_id, invitation_row.invited_by)
    on conflict do nothing;
  end if;

  update public.invitations set accepted_at = now() where id = invitation_row.id;

  insert into public.audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, metadata
  ) values (
    invitation_row.organization_id, current_user_id, 'invitation.accepted',
    'access_memberships', accepted_membership_id::text,
    jsonb_build_object('invitationId', invitation_row.id)
  );

  return accepted_membership_id;
end;
$$;

revoke all on function public.accept_team_invitation_by_id(uuid) from public;
revoke all on function public.accept_team_invitation_by_id(uuid) from anon;
grant execute on function public.accept_team_invitation_by_id(uuid) to authenticated;
