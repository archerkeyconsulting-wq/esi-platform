import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STATUS_LABELS } from '@/lib/scoring/ors-lite'
import { STATUS_TEXT_CLASS } from '@/components/StatusDot'

export const revalidate = 0

export default async function AdminFirmCompanies({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  const { data: firm } = await supabase
    .from('firms')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!firm) notFound()

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, slug, industry, hold_start_date')
    .eq('firm_id', firm.id)
    .order('name', { ascending: true })

  const companyIds = companies?.map((c) => c.id) ?? []
  const latestMap = new Map<
    string,
    { risk_score: number | null; status: string | null; created_at: string }
  >()
  if (companyIds.length > 0) {
    const { data: assessments } = await supabase
      .from('assessments')
      .select('company_id, risk_score, status, created_at')
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })

    for (const a of assessments ?? []) {
      if (!latestMap.has(a.company_id)) {
        latestMap.set(a.company_id, {
          risk_score: a.risk_score,
          status: a.status,
          created_at: a.created_at,
        })
      }
    }
  }

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/admin/firms/${firm.slug}`}
          className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink"
        >
          ← {firm.name}
        </Link>
      </div>

      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Admin · {firm.name} · Companies
        </div>
        <h1 className="font-display text-5xl text-ink tracking-tight">
          Portfolio management
        </h1>
      </header>

      <div className="border border-rule">
        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 border-b border-rule font-mono text-xs uppercase tracking-widest text-muted">
          <div>Company</div>
          <div>Industry</div>
          <div>Hold Start</div>
          <div>Latest Score</div>
          <div>Status</div>
        </div>
        <div className="divide-y divide-rule/60">
          {!companies?.length && (
            <div className="px-5 py-10 text-center font-sans text-sm text-muted">
              No companies.
            </div>
          )}
          {companies?.map((c) => {
            const latest = latestMap.get(c.id)
            return (
              <div
                key={c.id}
                className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr] gap-4 px-5 py-3 items-center"
              >
                <div>
                  <Link
                    href={`/company/${c.slug}`}
                    className="font-sans text-sm text-ink hover:underline"
                  >
                    {c.name}
                  </Link>
                </div>
                <div className="font-sans text-sm text-muted">
                  {c.industry ?? '—'}
                </div>
                <div className="font-mono text-xs text-muted">
                  {c.hold_start_date
                    ? new Date(c.hold_start_date).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </div>
                <div className="font-mono text-sm text-ink">
                  {latest?.risk_score ?? '—'}
                </div>
                <div>
                  {latest?.status ? (
                    <span
                      className={`font-mono text-xs uppercase tracking-widest ${STATUS_TEXT_CLASS[latest.status as keyof typeof STATUS_TEXT_CLASS]}`}
                    >
                      {STATUS_LABELS[latest.status as keyof typeof STATUS_LABELS]}
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-muted uppercase tracking-widest">
                      Not assessed
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-8 bg-signal-bg p-4 font-sans text-sm text-muted max-w-3xl leading-relaxed">
        Company creation and edits are performed via SQL in MVP. Insert rows
        into the <code className="font-mono text-ink">companies</code> table
        with firm_id = <code className="font-mono text-ink">{firm.id}</code>.
      </div>
    </div>
  )
}
