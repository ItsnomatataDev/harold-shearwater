'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function UpdatePasswordForm() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(null)
    const password = String(new FormData(event.currentTarget).get('password') ?? '')
    const { error: updateError } = await createClient().auth.updateUser({ password })
    if (updateError) { setError(updateError.message); setLoading(false); return }
    router.replace('/auth/continue'); router.refresh()
  }
  return <form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="mb-2 block text-[11px] font-semibold text-[#b7b7b0]">New password</span><input name="password" type="password" minLength={8} required autoComplete="new-password" className="w-full rounded-xl border border-[#3a3a36] bg-[#232321] px-4 py-3 text-sm text-white focus:border-victoria focus:outline-none"/></label>{error && <p className="text-xs text-[#f18a77]">{error}</p>}<button disabled={loading} className="w-full rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white">{loading ? 'Updating…' : 'Set new password'}</button></form>
}
