import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SIGNAL_REGISTRY, type SignalType } from '@/lib/scoring/ors-lite'
import { EXTRACTOR_DESCRIPTIONS } from '@/lib/scoring/csv-mapping'
import { UploadTabs } from './UploadTabs'

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

export default async function UploadPage({
  params,
}: {
  params: { slug: string }
}) {
  const supabase = createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, slug')
    .eq('slug', params.slug)
    .maybeSingle()

  if (!company) notFound()

  const { data: latest } = await supabase
    .from('assessments')
    .select('id, created_at, source_type')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  let lastBySignal = new Map<string, string>()
  if (latest) {
    const { data: signals } = await supabase
      .from('signals')
      .select('signal_type')
      .eq('assessment_id', latest.id)
    for (const s of signals ?? []) {
      lastBySignal.set(s.signal_type, latest.created_at)
    }
  }

  const rows = SIGNAL_ORDER.map((t) => ({
    signal_type: t,
    name: SIGNAL_REGISTRY[t].name,
    description: EXTRACTOR_DESCRIPTIONS[t],
    last_uploaded: lastBySignal.get(t) ?? null,
  }))

  return (
    <div>
      <div className="mb-8">
        <Link
          href={`/company/${company.slug}`}
          className="font-mono text-xs uppercase tracking-widest text-muted hover:text-ink"
        >
          ← Back to {company.name}
        </Link>
      </div>

      <header className="mb-10">
        <div className="font-mono text-xs uppercase tracking-widest text-muted mb-2">
          Data Ingestion
        </div>
        <h1 className="font-display text-5xl text-ink tracking-tight">
          Upload data for {company.name}
        </h1>
      </header>

      <UploadTabs slug={company.slug} rows={rows} />
    </div>
  )
}
