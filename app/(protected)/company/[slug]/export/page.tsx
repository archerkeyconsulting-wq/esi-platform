import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  SIGNAL_REGISTRY,
  type Category,
  type SignalType,
} from '@/lib/scoring/ors-lite'
import { STATUS_TEXT_CLASS } from '@/components/StatusDot'
import { ExportActions } from './ExportActions'
import type { SignalSeverity } from '@/lib/db/types'

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

const SEVERITY_LABEL: Record<SignalSeverity, string> = {
  none: 'None',
  mild: 'Mild',
  moderate: 'Moderate',
  severe: 'Severe',
}

export default async function ExportPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug, industry')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!company) notFound()

  const { data: latest } = await supabase
    .from('assessments')
    .select('id, risk_score, status, created_at, source_type, scoring_model_version')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: signals } = latest
    ? await supabase
        .from('signals')
        .select('signal_type, category, severity, contribution, evidence, raw_value')
        .eq('assessment_id', latest.id)
    : { data: [] }

  const preparedBy = 'Demo User'
  const signalsByType = new Map((signals ?? []).map((s) => [s.signal_type, s]))
  const drivers = (signals ?? [])
    .filter((s) => s.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)

  const assessedOn = latest
    ? new Date(latest.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const plainTextBrief = buildPlainText(
    company.name,
    company.industry ?? null,
    assessedOn,
    preparedBy,
    latest,
    signals ?? [],
  )

  return (
    <div>
      <div className="mb-8" data-print-hide>
        <Link
          href={`/company/${company.slug}`}
          className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink"
        >
          ← Back to {company.name}
        </Link>
      </div>

      <div data-print-hide>
        <ExportActions plainText={plainTextBrief} />
      </div>

      <article className="max-w-[780px] border border-rule p-12 bg-white print:border-0 print:p-0">
        <header className="mb-10 pb-6 border-b border-rule">
          <div className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
            Operational Risk Brief
          </div>
          <h1 className="font-display text-4xl text-ink tracking-tight mb-2">
            {company.name}
          </h1>
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            {company.industry ?? 'Industry unspecified'}
            {assessedOn && <> · Assessment: {assessedOn}</>}
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted mt-1">
            Prepared by {preparedBy}
          </div>
        </header>

        {!latest && (
          <div className="font-sans text-sm text-muted italic">
            No assessment recorded. Upload data to generate a brief.
          </div>
        )}

        {latest && (
          <>
            <section className="mb-10">
              <div className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
                Risk Summary
              </div>
              <div className="flex items-baseline gap-4">
                <span className="font-mono text-6xl text-ink">
                  {latest.risk_score}
                </span>
                <span
                  className={`font-mono text-sm uppercase tracking-widest ${latest.status ? STATUS_TEXT_CLASS[latest.status as keyof typeof STATUS_TEXT_CLASS] : ''}`}
                >
                  {latest.status ? STATUS_LABELS[latest.status as keyof typeof STATUS_LABELS] : ''}
                </span>
              </div>
              <div className="font-mono text-xs text-muted uppercase tracking-wide mt-2">
                Scoring model: {latest.scoring_model_version}
              </div>
            </section>

            <section className="mb-10">
              <div className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
                Score Drivers
              </div>
              {drivers.length === 0 ? (
                <div className="font-sans text-sm text-muted italic">
                  No active signal drivers.
                </div>
              ) : (
                <ul className="divide-y divide-rule/60">
                  {drivers.map((d) => (
                    <li
                      key={d.signal_type}
                      className="flex items-baseline justify-between py-2"
                    >
                      <span className="font-sans text-sm text-ink">
                        {SIGNAL_REGISTRY[d.signal_type as SignalType].name}
                      </span>
                      <span className="font-mono text-sm text-ink">+{d.contribution}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="mb-10">
              <div className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
                Signal Detail
              </div>
              <div className="divide-y divide-rule/60 border-t border-b border-rule">
                {SIGNAL_ORDER.map((t) => {
                  const s = signalsByType.get(t)
                  const severity = (s?.severity ?? 'none') as SignalSeverity
                  const reg = SIGNAL_REGISTRY[t]
                  return (
                    <div key={t} className="py-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="font-sans text-sm text-ink">
                            {reg.name}
                          </div>
                          <div className="font-mono text-xs uppercase tracking-wide text-muted">
                            {CATEGORY_LABELS[reg.category as Category]}
                          </div>
                        </div>
                        <div className="font-mono text-xs uppercase tracking-widest text-muted">
                          {SEVERITY_LABEL[severity]} · {s?.contribution ?? 0} pts
                        </div>
                      </div>
                      {s?.evidence && (
                        <div className="font-sans text-sm text-muted mt-2 leading-relaxed">
                          {s.evidence}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            <section className="mb-4">
              <div className="font-mono text-xs uppercase tracking-widest text-muted mb-3">
                Operational Assessment
              </div>
              <div className="bg-signal-bg p-5 font-sans text-sm text-muted italic leading-relaxed">
                Narrative generation coming soon. This section will translate the
                scored output above into plain-language board commentary. The
                operating partner can edit the narrative before inclusion in the
                board package.
              </div>
            </section>
          </>
        )}
      </article>
    </div>
  )
}

function buildPlainText(
  companyName: string,
  industry: string | null,
  assessedOn: string | null,
  preparedBy: string,
  assessment:
    | {
        risk_score: number | null
        status: string | null
        scoring_model_version: string
      }
    | null,
  signals: Array<{
    signal_type: string
    severity: string
    contribution: number
    evidence: string | null
  }>,
): string {
  const lines: string[] = []
  lines.push('OPERATIONAL RISK BRIEF')
  lines.push(companyName)
  if (industry) lines.push(industry)
  if (assessedOn) lines.push(`Assessment: ${assessedOn}`)
  lines.push(`Prepared by: ${preparedBy}`)
  lines.push('')
  if (!assessment) {
    lines.push('No assessment recorded.')
    return lines.join('\n')
  }
  lines.push('RISK SUMMARY')
  lines.push(
    `Operational Risk Score: ${assessment.risk_score ?? '—'} | ${(assessment.status ?? '').toUpperCase()}`,
  )
  lines.push(`Scoring model: ${assessment.scoring_model_version}`)
  lines.push('')
  lines.push('SCORE DRIVERS')
  const drivers = signals
    .filter((s) => s.contribution > 0)
    .sort((a, b) => b.contribution - a.contribution)
  for (const d of drivers) {
    const name = SIGNAL_REGISTRY[d.signal_type as SignalType]?.name ?? d.signal_type
    lines.push(`  ${name} +${d.contribution}`)
  }
  lines.push('')
  lines.push('SIGNAL DETAIL')
  for (const s of signals) {
    const name = SIGNAL_REGISTRY[s.signal_type as SignalType]?.name ?? s.signal_type
    lines.push(`  ${name} — ${s.severity.toUpperCase()} (${s.contribution} pts)`)
    if (s.evidence) lines.push(`    ${s.evidence}`)
  }
  return lines.join('\n')
}
