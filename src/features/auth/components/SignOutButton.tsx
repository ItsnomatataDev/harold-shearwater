'use client'

import { createClient } from '@/lib/supabase/client'

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  async function signOut() {
    await createClient().auth.signOut()
    window.location.assign('/auth')
  }
  return <button onClick={signOut} className={compact ? 'text-[10px] text-[#777771] hover:text-white' : 'rounded-xl border border-[#3a3a36] px-4 py-2.5 text-xs font-semibold text-[#c7c7c0] hover:bg-[#292927]'}>Sign out</button>
}
