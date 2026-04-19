'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()
  console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <h1 className="font-display text-6xl text-ink mb-1 tracking-tight">NARO</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Portfolio Operational Intelligence
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-rule bg-paper text-ink font-sans text-sm focus:outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block font-mono text-xs uppercase tracking-widest text-muted mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-rule bg-paper text-ink font-sans text-sm focus:outline-none focus:border-ink"
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-signal-bg border border-rule text-ink font-sans text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-ink text-paper font-sans text-sm font-medium uppercase tracking-widest hover:bg-muted disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <div className="mt-10 pt-6 border-t border-rule">
          <p className="font-mono text-xs text-muted text-center tracking-wide">
            Need an account? Contact your administrator.
          </p>
        </div>
      </div>
    </main>
  )
}
