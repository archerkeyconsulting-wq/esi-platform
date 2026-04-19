import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function AdminFirmsList() {
  const supabase = createClient()

  const { data: firms } = await supabase
    .from('firms')
    .select('id, name, slug, created_at')
    .order('name', { ascending: true })

  const firmIds = firms?.map((f) => f.id) ?? []

  const companyCounts = new Map<string, number>()
  const profileCounts = new Map<string, number>()

  if (firmIds.length > 0) {
    const { data: companies } = await supabase
      .from('companies')
      .select('firm_id')
      .in('firm_id', firmIds)
    for (const c of companies ?? []) {
      companyCounts.set(c.firm_id, (companyCounts.get(c.firm_id) ?? 0) + 1)
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('firm_id')
      .in('firm_id', firmIds)
    for (const p of profiles ?? []) {
      if (p.firm_id) {
        profileCounts.set(p.firm_id, (profileCounts.get(p.firm_id) ?? 0) + 1)
      }
    }
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin"
          className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink"
        >
          ← Admin Overview
        </Link>
      </div>

      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Admin · Firms
        </div>
        <h1 className="font-display text-5xl text-ink tracking-tight">All firms</h1>
      </header>

      <div className="border border-rule">
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-rule font-mono text-xs uppercase tracking-widest text-muted">
          <div>Firm</div>
          <div>Companies</div>
          <div>Users</div>
          <div>Created</div>
        </div>
        {!firms?.length && (
          <div className="px-5 py-10 text-center font-sans text-sm text-muted">
            No firms yet.
          </div>
        )}
        <div className="divide-y divide-rule/60">
          {firms?.map((f) => (
            <Link
              key={f.id}
              href={`/admin/firms/${f.slug}`}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-5 py-3 items-center hover:bg-signal-bg"
            >
              <div className="font-sans text-sm text-ink">{f.name}</div>
              <div className="font-mono text-sm text-muted">
                {companyCounts.get(f.id) ?? 0}
              </div>
              <div className="font-mono text-sm text-muted">
                {profileCounts.get(f.id) ?? 0}
              </div>
              <div className="font-mono text-sm text-muted">
                {new Date(f.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
