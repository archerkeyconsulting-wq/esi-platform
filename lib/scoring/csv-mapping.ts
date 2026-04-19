// Deterministic CSV → signal severity mappings for each ORS-LITE signal.
// Each mapping accepts parsed rows for that signal's CSV template and returns
// a severity + evidence blurb + raw value to store.

import type { Severity, SignalType } from './ors-lite'

export interface CsvRow {
  [key: string]: string | undefined
}

export interface SignalExtraction {
  severity: Severity
  evidence: string
  raw_value: string | null
}

function toNumber(v: string | undefined): number | null {
  if (v === undefined || v === null) return null
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''))
  return Number.isFinite(n) ? n : null
}

function bandFromThresholds(
  value: number,
  thresholds: { mild: number; moderate: number; severe: number },
): Severity {
  if (value >= thresholds.severe) return 'severe'
  if (value >= thresholds.moderate) return 'moderate'
  if (value >= thresholds.mild) return 'mild'
  return 'none'
}

// ---------------------------------------------------------------
// Per-signal extractors
// ---------------------------------------------------------------

function extractSupplierConcentration(rows: CsvRow[]): SignalExtraction {
  // Expected columns: supplier_name, spend_percent, component_criticality, alternative_count
  // Severity driven by max spend_percent.
  const shares = rows
    .map((r) => toNumber(r.spend_percent))
    .filter((n): n is number => n !== null)
  if (shares.length === 0) {
    return { severity: 'none', evidence: 'No supplier data provided.', raw_value: null }
  }
  const top = Math.max(...shares)
  const severity = bandFromThresholds(top, { mild: 30, moderate: 50, severe: 70 })
  const criticalCount = rows.filter(
    (r) => (r.component_criticality ?? '').toLowerCase() === 'critical',
  ).length
  return {
    severity,
    evidence: `Top supplier share ${top.toFixed(0)}% (${rows.length} suppliers; ${criticalCount} flagged critical).`,
    raw_value: `${top.toFixed(0)}%`,
  }
}

function extractDemandFulfillment(rows: CsvRow[]): SignalExtraction {
  // Expected columns: month, otif_percent, backlog_growth_percent
  const latest = rows[rows.length - 1] ?? {}
  const otif = toNumber(latest.otif_percent)
  const backlog = toNumber(latest.backlog_growth_percent)
  // Severity: worse of OTIF decline or backlog growth.
  const otifDrop = otif === null ? 0 : Math.max(0, 95 - otif)
  const backlogSeverity = backlog === null ? 0 : Math.max(0, backlog)
  const blended = Math.max(otifDrop * 2, backlogSeverity)
  const severity = bandFromThresholds(blended, { mild: 10, moderate: 20, severe: 35 })
  const parts: string[] = []
  if (otif !== null) parts.push(`OTIF ${otif.toFixed(0)}%`)
  if (backlog !== null) parts.push(`backlog change ${backlog > 0 ? '+' : ''}${backlog.toFixed(0)}%`)
  return {
    severity,
    evidence: parts.length ? parts.join('; ') + '.' : 'No fulfillment data provided.',
    raw_value: backlog !== null ? `${backlog > 0 ? '+' : ''}${backlog.toFixed(0)}% backlog` : null,
  }
}

function extractQualityDrift(rows: CsvRow[]): SignalExtraction {
  // Expected columns: month, scrap_rate_percent, defect_rate_percent
  const deltas = rows
    .map((r) => toNumber(r.scrap_rate_percent))
    .filter((n): n is number => n !== null)
  if (deltas.length === 0) {
    return { severity: 'none', evidence: 'No quality data provided.', raw_value: null }
  }
  const first = deltas[0]
  const last = deltas[deltas.length - 1]
  const pctChange = first === 0 ? last : ((last - first) / first) * 100
  const severity = bandFromThresholds(pctChange, { mild: 5, moderate: 15, severe: 30 })
  return {
    severity,
    evidence: `Scrap rate trended from ${first.toFixed(1)}% to ${last.toFixed(1)}% (${pctChange.toFixed(0)}% change).`,
    raw_value: `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(0)}%`,
  }
}

function extractErpInstability(rows: CsvRow[]): SignalExtraction {
  // Expected columns: week, error_count, manual_override_count, downtime_hours
  const errorTotals = rows.map((r) => toNumber(r.error_count) ?? 0)
  if (errorTotals.length === 0) {
    return { severity: 'none', evidence: 'No ERP error data provided.', raw_value: null }
  }
  const first = errorTotals[0] || 1
  const last = errorTotals[errorTotals.length - 1]
  const pctChange = ((last - first) / Math.max(first, 1)) * 100
  const totalDowntime = rows.reduce((a, r) => a + (toNumber(r.downtime_hours) ?? 0), 0)
  const severity = bandFromThresholds(pctChange, { mild: 10, moderate: 20, severe: 40 })
  return {
    severity,
    evidence: `Error rate change ${pctChange > 0 ? '+' : ''}${pctChange.toFixed(0)}%; cumulative downtime ${totalDowntime.toFixed(1)}h.`,
    raw_value: `${pctChange > 0 ? '+' : ''}${pctChange.toFixed(0)}% errors`,
  }
}

function extractThroughputVariance(rows: CsvRow[]): SignalExtraction {
  // Expected columns: week, output_units, cycle_time_minutes
  const outputs = rows
    .map((r) => toNumber(r.output_units))
    .filter((n): n is number => n !== null)
  if (outputs.length < 2) {
    return { severity: 'none', evidence: 'Insufficient throughput data.', raw_value: null }
  }
  const mean = outputs.reduce((a, b) => a + b, 0) / outputs.length
  const variance =
    outputs.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / outputs.length
  const stddev = Math.sqrt(variance)
  const cv = mean === 0 ? 0 : (stddev / mean) * 100
  const severity = bandFromThresholds(cv, { mild: 8, moderate: 15, severe: 25 })
  return {
    severity,
    evidence: `Throughput coefficient of variation ${cv.toFixed(0)}% across ${outputs.length} periods.`,
    raw_value: `${cv.toFixed(0)}% variance`,
  }
}

function extractKnowledgeAttrition(rows: CsvRow[]): SignalExtraction {
  // Expected columns: employee_id, tenure_years, role_criticality, retirement_eligible_within_months
  if (rows.length === 0) {
    return { severity: 'none', evidence: 'No workforce data provided.', raw_value: null }
  }
  const critical = rows.filter(
    (r) => (r.role_criticality ?? '').toLowerCase() === 'critical',
  )
  const retirementRisk = critical.filter((r) => {
    const m = toNumber(r.retirement_eligible_within_months)
    return m !== null && m <= 24
  })
  const tenuredPct =
    (rows.filter((r) => (toNumber(r.tenure_years) ?? 0) >= 10).length / rows.length) * 100
  // Severity: blended. Retirement-risk critical count dominates.
  const score =
    retirementRisk.length * 20 + Math.max(0, 25 - tenuredPct)
  const severity = bandFromThresholds(score, { mild: 10, moderate: 25, severe: 45 })
  return {
    severity,
    evidence: `${retirementRisk.length} retirement-eligible critical roles within 24mo; ${tenuredPct.toFixed(0)}% tenured (10+ yrs).`,
    raw_value: `${retirementRisk.length} at-risk`,
  }
}

function extractExecutionLoad(rows: CsvRow[]): SignalExtraction {
  // Expected columns: initiative_name, status (on_track|delayed|blocked), owner, direct_reports_of_owner
  if (rows.length === 0) {
    return { severity: 'none', evidence: 'No initiative data provided.', raw_value: null }
  }
  const delayed = rows.filter((r) => {
    const s = (r.status ?? '').toLowerCase()
    return s === 'delayed' || s === 'blocked'
  }).length
  const delayPct = (delayed / rows.length) * 100
  const maxSpan = Math.max(
    0,
    ...rows.map((r) => toNumber(r.direct_reports_of_owner) ?? 0),
  )
  const blended = delayPct + Math.max(0, maxSpan - 7) * 5
  const severity = bandFromThresholds(blended, { mild: 15, moderate: 30, severe: 50 })
  return {
    severity,
    evidence: `${rows.length} initiatives; ${delayed} delayed/blocked (${delayPct.toFixed(0)}%); max leadership span ${maxSpan}.`,
    raw_value: `${rows.length} initiatives`,
  }
}

export const EXTRACTORS: Record<SignalType, (rows: CsvRow[]) => SignalExtraction> = {
  supplier_concentration: extractSupplierConcentration,
  demand_fulfillment: extractDemandFulfillment,
  quality_drift: extractQualityDrift,
  erp_instability: extractErpInstability,
  throughput_variance: extractThroughputVariance,
  knowledge_attrition: extractKnowledgeAttrition,
  execution_load: extractExecutionLoad,
}

// Human-readable description of the threshold logic, shown in the CSV
// template header so operators know what the mapping will do with their data.
export const EXTRACTOR_DESCRIPTIONS: Record<SignalType, string> = {
  supplier_concentration:
    'Severity from top supplier spend share: mild ≥30%, moderate ≥50%, severe ≥70%.',
  demand_fulfillment:
    'Severity from backlog growth or OTIF decline in the latest row.',
  quality_drift:
    'Severity from scrap-rate percent change first-to-last row.',
  erp_instability:
    'Severity from error count change first-to-last week; downtime is reported.',
  throughput_variance:
    'Severity from coefficient of variation of output_units across all rows.',
  knowledge_attrition:
    'Severity blends retirement-eligible critical roles within 24 months and tenured workforce percentage.',
  execution_load:
    'Severity blends percent delayed/blocked initiatives and max leadership span.',
}
