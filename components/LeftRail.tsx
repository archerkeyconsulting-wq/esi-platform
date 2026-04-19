'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { StatusDot } from './StatusDot'
import type { AssessmentStatus, Role } from '@/lib/db/types'

export interface LeftRailCompany {
  slug: string
  name: string
  risk_score: number | null
  status: AssessmentStatus | null
}

const STATUS_SHORT: Record<AssessmentStatus, string> = {
  healthy: 'HLTH',
  moderate: 'MOD',
  elevated: 'ELEV',
  critical: 'CRIT',
}

export function LeftRail({
  firmName,
  companies,
  userName,
  role,
}: {
  firmName: string
  companies: LeftRailCompany[]
  userName: string
  role: Role
}) {
  const pathname = usePathname() ?? ''

  return (
    <aside
      data-print-hide
      className="fixed inset-y-0 left-0 w-[240px] bg-ink text-paper flex flex-col"
    >
      <div className="px-5 py-6 border-b border-paper/10">
        <Link
          href="/dashboard"
          className="font-mono text-xs uppercase tracking-widest text-accent hover:opacity-80 block"
        >
          {firmName}
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <div className="px-3 mb-3 font-mono text-xs uppercase tracking-widest text-paper/50">
          Portfolio
        </div>

        <Link
          href="/dashboard"
          className={clsx(
            'block px-3 py-2 font-sans text-sm',
            pathname === '/dashboard'
              ? 'bg-paper/10 border-l-2 border-accent -ml-[2px] pl-[10px]'
              : 'border-l-2 border-transparent -ml-[2px] pl-[10px] hover:bg-paper/5',
          )}
        >
          Overview
        </Link>

        <div className="mt-2">
          {companies.length === 0 && (
            <div className="px-3 py-2 font-sans text-xs text-paper/40 italic">
              No companies yet
            </div>
          )}
          {companies.map((c) => {
            const active = pathname.startsWith(`/company/${c.slug}`)
            return (
              <Link
                key={c.slug}
                href={`/company/${c.slug}`}
                className={clsx(
                  'flex items-center justify-between px-3 py-2 font-sans text-sm',
                  active
                    ? 'bg-paper/10 border-l-2 border-accent -ml-[2px] pl-[10px]'
                    : 'border-l-2 border-transparent -ml-[2px] pl-[10px] hover:bg-paper/5',
                )}
              >
                <span className="flex items-center gap-2 truncate">
                  <StatusDot status={c.status} />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="font-mono text-xs text-paper/60 flex items-center gap-2 pl-2">
                  <span>{c.risk_score ?? '—'}</span>
                  {c.status && (
                    <span className="text-[10px]">{STATUS_SHORT[c.status]}</span>
                  )}
                </span>
              </Link>
            )
          })}
        </div>

        {role === 'super_admin' && (
          <div className="mt-6 pt-4 border-t border-paper/10">
            <div className="px-3 mb-2 font-mono text-xs uppercase tracking-widest text-paper/50">
              Admin
            </div>
            <Link
              href="/admin"
              className={clsx(
                'block px-3 py-2 font-sans text-sm',
                pathname.startsWith('/admin')
                  ? 'bg-paper/10 border-l-2 border-accent -ml-[2px] pl-[10px]'
                  : 'border-l-2 border-transparent -ml-[2px] pl-[10px] hover:bg-paper/5',
              )}
            >
              Overview
            </Link>
            <Link
              href="/admin/firms"
              className={clsx(
                'block px-3 py-2 font-sans text-sm',
                pathname.startsWith('/admin/firms')
                  ? 'bg-paper/10 border-l-2 border-accent -ml-[2px] pl-[10px]'
                  : 'border-l-2 border-transparent -ml-[2px] pl-[10px] hover:bg-paper/5',
              )}
            >
              Firms
            </Link>
          </div>
        )}
      </nav>

      <div className="px-5 py-4 border-t border-paper/10">
        <Link
          href="/settings"
          className="block font-sans text-sm text-paper hover:opacity-80"
        >
          Settings
        </Link>
        <div className="mt-3 font-mono text-xs text-paper/60 tracking-wide uppercase">
          {userName}
        </div>
        <div className="mt-2 font-mono text-[10px] text-paper/40 uppercase tracking-widest">
          Demo Mode
        </div>
      </div>
    </aside>
  )
}
