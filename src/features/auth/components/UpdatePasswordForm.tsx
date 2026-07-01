'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { PasswordInput } from '@/components/PasswordInput'

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
  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      <PasswordInput
        name="password"
        label="New password"
        minLength={8}
        required
        autoComplete="new-password"
      />
      {error && <p className="text-xs text-[#f18a77]">{error}</p>}
      <button disabled={loading} className="w-full rounded-xl bg-sunset px-4 py-3 text-sm font-semibold text-white">
        {loading ? 'Updating…' : 'Set new password'}
      </button>
    </form>
  )
}
