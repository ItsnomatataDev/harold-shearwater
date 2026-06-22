'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'

const InviteMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
})

const AssignRoleSchema = z.object({
  membershipId: z.string().uuid(),
  roleId: z.string().uuid(),
})

const SuspendMemberSchema = z.object({
  membershipId: z.string().uuid(),
})

const ActivateMemberSchema = z.object({
  membershipId: z.string().uuid(),
})

async function logAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, any>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  await supabase.from('audit_logs').insert({
    organization_id: organizationId,
    actor_user_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  })
}

export async function inviteTeamMember(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = InviteMemberSchema.parse(input)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const hasPermission = await supabase.rpc('has_permission', {
    target_organization_id: organizationId,
    required_permission: 'members.manage',
  })

  if (!hasPermission.data)
    throw new Error('You do not have permission to invite members')

  const tokenHash = require('crypto')
    .randomBytes(32)
    .toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: invitation, error: inviteError } = await supabase
    .from('invitations')
    .insert({
      organization_id: organizationId,
      email: parsed.email,
      access_type: 'team',
      role_id: parsed.roleId,
      token_hash: tokenHash,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select('id')
    .single()

  if (inviteError) throw inviteError

  await logAudit(supabase, organizationId, 'member.invited', 'invitation', invitation.id, {
    email: parsed.email,
    roleId: parsed.roleId,
  })

  return { success: true, invitationId: invitation.id }
}

export async function assignRoleToMember(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = AssignRoleSchema.parse(input)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const hasPermission = await supabase.rpc('has_permission', {
    target_organization_id: organizationId,
    required_permission: 'roles.manage',
  })

  if (!hasPermission.data)
    throw new Error('You do not have permission to manage roles')

  const { error } = await supabase.from('membership_roles').upsert(
    {
      membership_id: parsed.membershipId,
      role_id: parsed.roleId,
      assigned_by: user.id,
    },
    { onConflict: 'membership_id,role_id' },
  )

  if (error) throw error

  await logAudit(supabase, organizationId, 'role.assigned', 'membership_roles', parsed.membershipId, {
    roleId: parsed.roleId,
  })

  return { success: true }
}

export async function suspendMember(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = SuspendMemberSchema.parse(input)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const hasPermission = await supabase.rpc('has_permission', {
    target_organization_id: organizationId,
    required_permission: 'members.manage',
  })

  if (!hasPermission.data)
    throw new Error('You do not have permission to suspend members')

  const { error } = await supabase
    .from('access_memberships')
    .update({ status: 'suspended' })
    .eq('id', parsed.membershipId)

  if (error) throw error

  await logAudit(supabase, organizationId, 'member.suspended', 'access_memberships', parsed.membershipId, {})

  return { success: true }
}

export async function activateMember(
  organizationId: string,
  input: Record<string, any>,
) {
  const parsed = ActivateMemberSchema.parse(input)
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('User not authenticated')

  const hasPermission = await supabase.rpc('has_permission', {
    target_organization_id: organizationId,
    required_permission: 'members.manage',
  })

  if (!hasPermission.data)
    throw new Error('You do not have permission to activate members')

  const { error } = await supabase
    .from('access_memberships')
    .update({ status: 'active', joined_at: new Date().toISOString() })
    .eq('id', parsed.membershipId)

  if (error) throw error

  await logAudit(supabase, organizationId, 'member.activated', 'access_memberships', parsed.membershipId, {})

  return { success: true }
}
