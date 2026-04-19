'use server'

import { revalidatePath } from 'next/cache'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/server'
import {
  SIGNAL_REGISTRY,
  calculateOperationalRisk,
  type SignalType,
  type Severity,
} from '@/lib/scoring/ors-lite'
import { EXTRACTORS, type CsvRow } from '@/lib/scoring/csv-mapping'

const ALL_SIGNALS = Object.keys(SIGNAL_REGISTRY) as SignalType[]

export interface UploadCsvResult {
  ok: boolean
  error?: string
  assessment_id?: string
  score?: number
}

export async function uploadCsv(
  formData: FormData,
): Promise<UploadCsvResult> {
  const signalType = formData.get('signal_type') as SignalType | null
  const slug = formData.get('slug') as string | null
  const file = formData.get('file') as File | null

  if (!signalType || !(signalType in SIGNAL_REGISTRY)) {
    return { ok: false, error: 'Unknown signal type.' }
  }
  if (!slug) return { ok: false, error: 'Missing company slug.' }
  if (!file || file.size === 0) return { ok: false, error: 'No file provided.' }

  const supabase = createClient()

  const { data: company, error: companyErr } = await supabase
    .from('companies')
    .select('id, name')
    .eq('slug', slug)
    .maybeSingle()
  if (companyErr || !company) {
    return { ok: false, error: 'Company not found or access denied.' }
  }

  const text = await file.text()
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  })

  if (parsed.errors.length > 0) {
    return { ok: false, error: `CSV parse error: ${parsed.errors[0].message}` }
  }

  const rows = (parsed.data ?? []).filter((r) => Object.values(r).some((v) => v))

  const extractor = EXTRACTORS[signalType]
  const extraction = extractor(rows)

  // Find the latest assessment to carry forward untouched signals.
  const { data: prior } = await supabase
    .from('assessments')
    .select('id, created_at')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const priorSignals = new Map<SignalType, { severity: Severity; evidence: string | null; raw_value: string | null }>()
  if (prior) {
    const { data: priorRows } = await supabase
      .from('signals')
      .select('signal_type, severity, evidence, raw_value')
      .eq('assessment_id', prior.id)
    for (const r of priorRows ?? []) {
      if (ALL_SIGNALS.includes(r.signal_type as SignalType)) {
        priorSignals.set(r.signal_type as SignalType, {
          severity: r.severity as Severity,
          evidence: r.evidence,
          raw_value: r.raw_value,
        })
      }
    }
  }

  const fullSet = ALL_SIGNALS.map((t) => {
    if (t === signalType) {
      return {
        signal_type: t,
        severity: extraction.severity,
        evidence: extraction.evidence,
        raw_value: extraction.raw_value,
      }
    }
    const p = priorSignals.get(t)
    return {
      signal_type: t,
      severity: (p?.severity ?? 'none') as Severity,
      evidence: p?.evidence ?? null,
      raw_value: p?.raw_value ?? null,
    }
  })

  const scored = calculateOperationalRisk(
    fullSet.map((s) => ({ signal_type: s.signal_type, severity: s.severity })),
  )

  const { data: assessmentRow, error: assessmentErr } = await supabase
    .from('assessments')
    .insert({
      company_id: company.id,
      risk_score: scored.score,
      status: scored.status,
      source_type: 'csv',
      created_by: null,
      notes: `CSV upload: ${SIGNAL_REGISTRY[signalType].name}`,
    })
    .select('id')
    .single()

  if (assessmentErr || !assessmentRow) {
    return {
      ok: false,
      error: assessmentErr?.message ?? 'Failed to create assessment.',
    }
  }

  const signalInserts = scored.signals.map((s) => {
    const meta = fullSet.find((f) => f.signal_type === s.signal_type)!
    return {
      assessment_id: assessmentRow.id,
      signal_type: s.signal_type,
      category: s.category,
      severity: s.severity,
      contribution: s.contribution,
      evidence: meta.evidence,
      raw_value: meta.raw_value,
    }
  })

  const { error: signalErr } = await supabase.from('signals').insert(signalInserts)
  if (signalErr) {
    return { ok: false, error: signalErr.message }
  }

  revalidatePath('/dashboard')
  revalidatePath(`/company/${slug}`)
  revalidatePath(`/company/${slug}/upload`)

  return { ok: true, assessment_id: assessmentRow.id, score: scored.score }
}

export async function uploadDocumentStub(
  formData: FormData,
): Promise<{ ok: boolean; error?: string; filename?: string }> {
  const slug = formData.get('slug') as string | null
  const file = formData.get('file') as File | null
  if (!slug) return { ok: false, error: 'Missing company slug.' }
  if (!file || file.size === 0) return { ok: false, error: 'No file provided.' }

  const supabase = createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (!company) return { ok: false, error: 'Company not found.' }

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_')
  const path = `${company.id}/${Date.now()}-${safeName}`

  const { error: uploadErr } = await supabase.storage
    .from('documents')
    .upload(path, file, { upsert: false })

  if (uploadErr) return { ok: false, error: uploadErr.message }

  return { ok: true, filename: file.name }
}
