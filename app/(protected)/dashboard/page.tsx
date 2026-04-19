import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { StatusDot, STATUS_TEXT_CLASS } from '@/components/StatusDot'
import { STATUS_LABELS } from '@/lib/scoring/ors-lite'
import type { AssessmentStatus } from '@/lib/db/types'

export const revalidate = 0

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('id, slug, name, industry')
    .order('name', { ascending: true })

  const companyIds = (companies ?? []).map((c) => c.id)

  interface LatestAssessment {
    company_id: string
    risk_score: number | null
    status: AssessmentStatus | null
    created_at: string
    signal_count: number
  }

  const latestMap = new Map<string, LatestAssessment>()

  if (companyIds.length > 0) {
    const { data: assessments } = await supabase
      .from('assessments')
      .select('id, company_id, risk_score, status, created_at')
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })

    const latestIds: string[] = []
    for (const a of assessments ?? []) {
      if (!latestMap.has(a.company_id)) {
        latestMap.set(a.company_id, {
          company_id: a.company_id,
          risk_score: a.risk_score,
          status: a.status,
          created_at: a.created_at,
          signal_count: 0,
        })
        latestIds.push(a.id)
      }
    }

    if (latestIds.length > 0) {
      const { data: signals } = await supabase
        .from('signals')
        .select('assessment_id, severity')
        .in('assessment_id', latestIds)
        .neq('severity', 'none')

      const assessmentIdToCompany = new Map<string, string>()
      for (const a of assessments ?? []) {
        assessmentIdToCompany.set(a.id, a.company_id)
      }
      for (const s of signals ?? []) {
        const companyId = assessmentIdToCompany.get(s.assessment_id)
        if (companyId) {
          const row = latestMap.get(companyId)
          if (row) row.signal_count += 1
        }
      }
    }
  }

  const companyRows =
    companies?.map((c) => ({
      ...c,
      latest: latestMap.get(c.id),
    })) ?? []

  const assessed = companyRows.filter((r) => r.latest?.risk_score != null)
  const avgRisk =
    assessed.length > 0
      ? Math.round(
          assessed.reduce((a, r) => a + (r.latest?.risk_score ?? 0), 0) /
            assessed.length,
        )
      : null
  const needAttention = assessed.filter(
    (r) => r.latest?.status === 'elevated' || r.latest?.status === 'critical',
  ).length

  return (
    <div>
      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Portfolio Overview
        </div>
        <h1 className="font-display text-5xl text-ink tracking-tight">
          Which company needs your time this week?
        </h1>
      </header>

      <section className="grid grid-cols-3 gap-6 mb-12 border-t border-b border-rule py-8">
        <Stat label="Companies" value={companyRows.length.toString()} />
        <Stat label="Avg Risk" value={avgRisk !== null ? avgRisk.toString() : '—'} />
        <Stat label="Need Attention" value={needAttention.toString()} />
      </section>

      <section>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 pb-3 border-b border-rule font-mono text-xs uppercase tracking-widest text-muted">
          <div>Company</div>
          <div className="text-right">Risk Score</div>
          <div>Status</div>
          <div>Active Signals</div>
        </div>

        {companyRows.length === 0 && (
          <div className="py-10 text-center font-sans text-sm text-muted">
            No portfolio companies yet. Contact your administrator to add companies.
          </div>
        )}

        <div className="divide-y divide-rule/60">
          {companyRows.map((c) => (
            <Link
              key={c.id}
              href={`/company/${c.slug}`}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 py-4 items-center hover:bg-signal-bg -mx-3 px-3"
            >
              <div>
                <div className="font-sans font-medium text-ink">{c.name}</div>
                {c.industry && (
                  <div className="font-mono text-xs text-muted uppercase tracking-wide mt-0.5">
                    {c.industry}
                  </div>
                )}
              </div>
              <div className="text-right font-mono text-base text-ink">
                {c.latest?.risk_score ?? '—'}
              </div>
              <div className="flex items-center gap-2">
                {c.latest?.status ? (
                  <>
                    <StatusDot status={c.latest.status} />
                    <span
                      className={`font-mono text-xs uppercase tracking-widest ${STATUS_TEXT_CLASS[c.latest.status]}`}
                    >
                      {STATUS_LABELS[c.latest.status]}
                    </span>
                  </>
                ) : (
                  <span className="font-mono text-xs text-muted uppercase tracking-widest">
                    Not assessed
                  </span>
                )}
              </div>
              <div className="font-sans text-sm text-muted">
                {c.latest
                  ? `${c.latest.signal_count} active`
                  : '—'}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-5xl text-ink mb-2">{value}</div>
      <div className="font-mono text-xs uppercase tracking-widest text-muted">
        {label}
      </div>
    </div>
  )
}
