'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { CurrentUser } from '@/lib/auth'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }

      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push('/auth/login')
        return
      }

      setUser(currentUser)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const isAdmin = user.global_role === 'admin'
  const isCOO = user.org_role === 'coo'
  const isPESponsor = user.org_role === 'pe_sponsor'

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 w-64 h-screen bg-white border-r border-slate-200 shadow-sm">
        <div className="p-6 border-b border-slate-200">
          <h1 className="text-2xl font-bold text-slate-900">NARO</h1>
          <p className="text-sm text-slate-600">Execution Intelligence</p>
        </div>

        <nav className="p-4 space-y-2">
          <NavLink href="/dashboard" icon="📊" label="Dashboard" />
          {(isCOO || isAdmin) && (
            <NavLink href="/dashboard/signals" icon="📈" label="Signal Breakdown" />
          )}
          {(isCOO || isAdmin) && (
            <NavLink href="/dashboard/waterfall" icon="💰" label="Financial Impact" />
          )}
          {isPESponsor && (
            <NavLink href="/dashboard/portfolio" icon="🏢" label="Portfolio View" />
          )}
          <NavLink href="/assessment/new" icon="📝" label="New Assessment" />
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-slate-50">
          <div className="mb-4 p-3 bg-white rounded-lg border border-slate-200">
            <p className="text-xs text-slate-600 mb-1">Logged in as</p>
            <p className="text-sm font-medium text-slate-900 truncate">{user.email}</p>
            {user.organization && (
              <p className="text-xs text-slate-600 truncate">{user.organization.name}</p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        {children}
      </div>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  const router = useRouter()
  const pathname = typeof window !== 'undefined' ? window.location.pathname : ''
  const isActive = pathname === href

  return (
    <Link href={href}>
      <div
        className={`px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${
          isActive
            ? 'bg-brand-yellow text-slate-900 font-medium'
            : 'text-slate-700 hover:bg-slate-100'
        }`}
      >
        <span className="text-xl">{icon}</span>
        <span>{label}</span>
      </div>
    </Link>
  )
}
