import { z } from 'zod'

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
})

export function getSupabaseConfig() {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  })

  if (!result.success) throw new Error('Supabase environment variables are missing or invalid. Copy .env.example to .env.local.')
  return { url: result.data.NEXT_PUBLIC_SUPABASE_URL, publishableKey: result.data.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY }
}
