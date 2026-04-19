'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'

const MESSAGES: Record<string, { title: string; description: string }> = {
  'no-profile': {
    title: 'Account Not Configured',
    description:
      'Your user account exists but has not been assigned a role or firm. Please contact your administrator to complete setup.',
  },
  'no-session': {
    title: 'Session Expired',
    description: 'Your session has expired. Please sign in again.',
  },
  unauthorized: {
    title: 'Unauthorized',
    description: 'You do not have permission to access this page.',
  },
}

function ErrorContent() {
  const params = useSearchParams()
  const router = useRouter()
  const reason = params.get('reason') ?? 'unauthorized'
  const error = MESSAGES[reason] ?? MESSAGES.unauthorized

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl text-ink mb-3 tracking-tight">
            {error.title}
          </h1>
          <p className="font-sans text-sm text-muted leading-relaxed">
            {error.description}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 bg-ink text-paper font-sans text-sm uppercase tracking-widest hover:bg-muted"
          >
            Return to Login
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full px-4 py-2 border border-rule text-ink font-sans text-sm uppercase tracking-widest hover:bg-signal-bg"
          >
            Home
          </button>
        </div>
      </div>
    </main>
  )
}

export default function ErrorPage() {
  return (
    <Suspense fallback={null}>
      <ErrorContent />
    </Suspense>
  )
}
