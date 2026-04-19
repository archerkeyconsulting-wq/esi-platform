import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ScorePanel } from '@/components/ScorePanel'
import { SignalCard } from '@/components/SignalCard'
import { StatusDot, STATUS_TEXT_CLASS } from '@/components/StatusDot'
import {
  CATEGORY_LABELS,
  CATEGORY_MAX,
  STATUS_LABELS,
  statusForScore,
  SIGNAL_REGISTRY,
  type Category,
  type SignalType,
} from '@/lib/scoring/ors-lite'
import type { AssessmentStatus, SignalSeverity } from '@/lib/db/types'

export const revalidate = 0

const SIGNAL_ORDER: SignalType[] = [
  'supplier_concentration',
  'demand_fulfillment',
  'quality_drift',
  'erp_instability',
  'throughput_variance',
  'knowledge_attrition',
  'execution_load',
]

export default async function CompanyCommandView({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, industry, hold_start_date')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!company) notFound()

  const { data: assessments } = await supabase
    .from('assessments')
    .select('id, risk_score, status, created_at, scoring_model_version, source_type, notes')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  const latest = assessments?.[0]

  type SignalRow = {
    signal_type: string
    category: Category
    severity: SignalSeverity
    contribution: number
    evidence: string | null
    raw_value: string | null
  }

  const signals: SignalRow[] = latest
    ? (
        (
          await supabase
            .from('signals')
            .select('signal_type, category, severity, contribution, evidence, raw_value')
            .eq('assessment_id', latest.id)
        ).data ?? []
      ) as SignalRow[]
    : []

  const signalsByType = new Map<string, SignalRow>()
  for (const s of signals) signalsByType.set(s.signal_type, s)

  const categoryScores: Record<Category, number> = {
    operational_stability: 0,
    systems_reliability: 0,
    organizational_capacity: 0,
  }
  for (const s of signals ?? []) {
    categoryScores[s.category] += s.contribution
  }

  const orderedSignals = SIGNAL_ORDER.map((t) => ({ signal_type: t, row: signalsByType.get(t) }))
  const activeDrivers = (signals ?? [])
    .filter((s) => s.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
  const activeSignalCount = activeDrivers.length
  const rawTotal =
    categoryScores.operational_stability +
    categoryScores.systems_reliability +
    categoryScores.organizational_capacity

  return (
    <div>
      <div className="mb-8" data-print-hide>
        <Link
          href="/dashboard"
          className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink"
        >
          ← Back to Portfolio
        </Link>
      </div>

      <header className="mb-12">
        <h1 className="font-display text-5xl text-ink tracking-tight mb-2">
          {company.name}
        </h1>
        <div className="font-mono text-xs uppercase tracking-widest text-muted">
          {company.industry ?? 'Industry unspecified'}
          {company.hold_start_date && (
            <>
              {'  ·  '}Hold{' '}
              {new Date(company.hold_start_date).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </>
          )}
        </div>
      </header>

      {!latest && (
        <div className="border border-rule p-10 text-center">
          <p className="font-sans text-base text-ink mb-2">
            No assessment recorded for this company yet.
          </p>
          <p className="font-sans text-sm text-muted mb-6">
            Upload CSV data to generate an Operational Risk Score.
          </p>
          <Link
            href={`/company/${company.slug}/upload`}
            className="inline-block bg-ink text-paper px-6 py-2 font-sans text-sm uppercase tracking-widest hover:bg-muted"
          >
            Upload Data
          </Link>
        </div>
      )}

      {latest && (
        <>
          <div className="grid grid-cols-[55fr_45fr] gap-10 mb-12">
            <div className="border-t border-rule pt-6">
              <ScorePanel
                score={latest.risk_score}
                status={latest.status}
                signalCount={activeSignalCount}
                assessedAt={latest.created_at}
              />
            </div>

            <div className="border-t border-rule pt-6">
              <div className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
                Score Drivers
              </div>

              <div className="space-y-2">
                {activeDrivers.length === 0 && (
                  <div className="font-sans text-sm text-muted italic">
                    No active signal drivers.
                  </div>
                )}
                {activeDrivers.map((s) => (
                  <div
                    key={s.signal_type}
                    className="flex items-baseline justify-between"
                  >
                    <span className="font-sans text-sm text-ink">
                      {SIGNAL_REGISTRY[s.signal_type as SignalType].name}
                    </span>
                    <span className="font-mono text-sm text-ink">+{s.contribution}</span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-rule my-4" />

              <div className="flex items-baseline justify-between">
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  Total Raw
                </span>
                <span className="font-mono text-sm text-ink">{rawTotal} / 100 pts</span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <span className="font-mono text-xs uppercase tracking-widest text-muted">
                  Normalized
                </span>
                <span className="font-mono text-sm text-ink">{latest.risk_score}</span>
              </div>
            </div>
          </div>

          <section className="mb-10">
            <div className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
              Signal Categories
            </div>
            <div className="border-t border-b border-rule divide-y divide-rule/60">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((cat) => {
                const raw = categoryScores[cat]
                const pct = raw / CATEGORY_MAX[cat]
                const derivedScore = Math.round(pct * 100)
                const derivedStatus: AssessmentStatus = statusForScore(derivedScore)
                return (
                  <div
                    key={cat}
                    className="grid grid-cols-[2fr_1fr_1fr] gap-4 py-3 items-center"
                  >
                    <div className="font-sans text-sm text-ink">
                      {CATEGORY_LABELS[cat]}
                    </div>
                    <div className="font-mono text-sm text-muted">
                      {raw} / {CATEGORY_MAX[cat]} pts
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <StatusDot status={derivedStatus} />
                      <span
                        className={`font-mono text-xs uppercase tracking-widest ${STATUS_TEXT_CLASS[derivedStatus]}`}
                      >
                        {STATUS_LABELS[derivedStatus]}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
              Observed Signals
            </div>
            <div className="border border-rule divide-y divide-rule/60">
              {orderedSignals.map(({ signal_type, row }) => (
                <SignalCard
                  key={signal_type}
                  signal_type={signal_type}
                  severity={row?.severity ?? 'none'}
                  contribution={row?.contribution ?? 0}
                  evidence={row?.evidence ?? null}
                  raw_value={row?.raw_value ?? null}
                />
              ))}
            </div>
          </section>

          <div className="flex gap-3" data-print-hide>
            <Link
              href={`/company/${company.slug}/upload`}
              className="inline-block bg-ink text-paper px-6 py-2 font-sans text-sm uppercase tracking-widest hover:bg-muted"
            >
              Upload Data
            </Link>
            <Link
              href={`/company/${company.slug}/export`}
              className="inline-block border border-ink text-ink px-6 py-2 font-sans text-sm uppercase tracking-widest hover:bg-ink hover:text-paper"
            >
              Export for Board
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
