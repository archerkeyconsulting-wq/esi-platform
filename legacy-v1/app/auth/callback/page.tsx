'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session) {
          setError('Failed to authenticate. Please try again.')
          setLoading(false)
          return
        }

        // Create or update user in database
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(
            {
              id: session.user.id,
              email: session.user.email || '',
              name: session.user.email?.split('@')[0] || 'User',
              global_role: 'user',
            },
            { onConflict: 'id' }
          )

        if (upsertError) {
          setError('Failed to create user. Please try again.')
          setLoading(false)
          return
        }

        // Redirect to dashboard
        router.push('/dashboard')
      } catch (err) {
        console.error('Auth callback error:', err)
        setError('An unexpected error occurred')
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h1 className="text-xl font-bold text-red-600 mb-4">Authentication Error</h1>
            <p className="text-slate-600 mb-8">{error}</p>
            <a href="/auth/login" className="btn-primary">
              Try Again
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Authenticating...</p>
        </div>
      </div>
    </div>
  )
}
