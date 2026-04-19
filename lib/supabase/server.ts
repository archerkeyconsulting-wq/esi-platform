import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Server components + server actions + route handlers.
// Note: we deliberately do not pass a Database generic here. Hand-authored
// row types live in lib/db/types.ts and are applied per-query by callers
// that need typed output. Keeping the client untyped side-steps the
// @supabase/ssr vs @supabase/supabase-js type-version mismatch.
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Called from a Server Component — can be ignored.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // Called from a Server Component — can be ignored.
          }
        },
      },
    },
  )
}
