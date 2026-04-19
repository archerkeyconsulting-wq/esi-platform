import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  operating_partner: 'Operating Partner',
  gp: 'General Partner',
  read_only: 'Read-Only',
}

export default async function AdminFirmDetail({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  const { data: firm } = await supabase
    .from('firms')
    .select('id, name, slug, created_at')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!firm) notFound()

  const [{ data: companies }, { data: profiles }] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, slug, industry, hold_start_date, created_at')
      .eq('firm_id', firm.id)
      .order('name', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('firm_id', firm.id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <div>
      <div className="mb-8">
        <Link
          href="/admin/firms"
          className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink"
        >
          ← Firms
        </Link>
      </div>

      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Admin · Firm
        </div>
        <h1 className="font-display text-5xl text-ink tracking-tight">
          {firm.name}
        </h1>
        <div className="font-mono text-xs uppercase tracking-widest text-muted mt-2">
          {firm.slug} · Created{' '}
          {new Date(firm.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </div>
      </header>

      <section className="mb-12">
        <div className="flex items-baseline justify-between mb-3">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            Portfolio Companies
          </div>
          <Link
            href={`/admin/firms/${firm.slug}/companies`}
            className="font-mono text-xs uppercase tracking-widest text-ink hover:text-muted"
          >
            Manage →
          </Link>
        </div>
        <div className="border border-rule divide-y divide-rule/60">
          {!companies?.length && (
            <div className="px-5 py-6 font-sans text-sm text-muted text-center italic">
              No companies yet.
            </div>
          )}
          {companies?.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[2fr_1.5fr_1fr] gap-4 px-5 py-3 items-center"
            >
              <div>
                <div className="font-sans text-sm text-ink">{c.name}</div>
                <div className="font-mono text-xs text-muted uppercase tracking-wide mt-0.5">
                  {c.slug}
                </div>
              </div>
              <div className="font-sans text-sm text-muted">
                {c.industry ?? '—'}
              </div>
              <div className="font-mono text-xs text-muted uppercase tracking-wide">
                Hold:{' '}
                {c.hold_start_date
                  ? new Date(c.hold_start_date).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
          Users
        </div>
        <div className="border border-rule divide-y divide-rule/60">
          {!profiles?.length && (
            <div className="px-5 py-6 font-sans text-sm text-muted text-center italic">
              No users assigned to this firm yet.
            </div>
          )}
          {profiles?.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[2fr_1.5fr_1fr] gap-4 px-5 py-3 items-center"
            >
              <div className="font-sans text-sm text-ink">
                {p.full_name ?? '(unnamed)'}
              </div>
              <div className="font-mono text-xs text-muted uppercase tracking-widest">
                {ROLE_LABELS[p.role] ?? p.role}
              </div>
              <div className="font-mono text-xs text-muted">
                {new Date(p.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 bg-signal-bg p-4 font-sans text-sm text-muted max-w-3xl leading-relaxed">
          To add a user: create the auth user in Supabase, then insert a row in
          the <code className="font-mono text-ink">profiles</code> table with
          firm_id = <code className="font-mono text-ink">{firm.id}</code>.
        </div>
      </section>
    </div>
  )
}
