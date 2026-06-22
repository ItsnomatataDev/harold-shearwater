'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTeamContext } from '@/features/auth/services/auth-context'

export async function setTaskCompleted(taskId: string, completed: boolean) {
  const team = await requireTeamContext()
  if (!team) throw new Error('Team Access is required.')
  const { error } = await (await createClient()).from('tasks').update({ status: completed ? 'completed' : 'open', completed_at: completed ? new Date().toISOString() : null }).eq('id', taskId)
  if (error) throw new Error(error.message)
  revalidatePath('/team/basecamp')
}

export async function toggleAttendance() {
  const team = await requireTeamContext()
  if (!team || !team.membership.organizationId) throw new Error('Team Access is required.')
  const supabase = await createClient()
  const { data: openEntry, error: readError } = await supabase.from('attendance_entries').select('id').eq('membership_id', team.membership.id).is('clocked_out_at', null).maybeSingle()
  if (readError) throw new Error(readError.message)
  const result = openEntry
    ? await supabase.from('attendance_entries').update({ clocked_out_at: new Date().toISOString() }).eq('id', openEntry.id)
    : await supabase.from('attendance_entries').insert({ organization_id: team.membership.organizationId, membership_id: team.membership.id, location_id: team.membership.primaryLocationId })
  if (result.error) throw new Error(result.error.message)
  revalidatePath('/team/basecamp')
}
