// ORS-LITE deterministic scoring engine.
// No ML, no AI. Every output is reproducible from inputs.
// Invoked when a new assessment is created from CSV upload.
// Seeded historical assessments preserve their recorded risk_score directly.

export type Severity = 'none' | 'mild' | 'moderate' | 'severe'
export type Status = 'healthy' | 'moderate' | 'elevated' | 'critical'
export type Category =
  | 'operational_stability'
  | 'systems_reliability'
  | 'organizational_capacity'

export const SEVERITY_POINTS: Record<Severity, number> = {
  none: 0,
  mild: 5,
  moderate: 10,
  severe: 15,
}

export const SIGNAL_REGISTRY = {
  // Operational Stability (max 40 pts)
  supplier_concentration: {
    name: 'Supplier Concentration Risk',
    category: 'operational_stability' as Category,
    maxContribution: 15,
  },
  demand_fulfillment: {
    name: 'Demand Fulfillment Friction',
    category: 'operational_stability' as Category,
    maxContribution: 15,
  },
  quality_drift: {
    name: 'Quality Drift',
    category: 'operational_stability' as Category,
    maxContribution: 10,
  },
  // Systems Reliability (max 30 pts)
  erp_instability: {
    name: 'Enterprise Systems Instability',
    category: 'systems_reliability' as Category,
    maxContribution: 15,
  },
  throughput_variance: {
    name: 'Operational Throughput Variance',
    category: 'systems_reliability' as Category,
    maxContribution: 15,
  },
  // Organizational Capacity (max 30 pts)
  knowledge_attrition: {
    name: 'Knowledge Attrition Risk',
    category: 'organizational_capacity' as Category,
    maxContribution: 15,
  },
  execution_load: {
    name: 'Execution Load Saturation',
    category: 'organizational_capacity' as Category,
    maxContribution: 15,
  },
} as const

export type SignalType = keyof typeof SIGNAL_REGISTRY

export const CATEGORY_LABELS: Record<Category, string> = {
  operational_stability: 'Operational Stability',
  systems_reliability: 'Systems Reliability',
  organizational_capacity: 'Organizational Capacity',
}

export const CATEGORY_MAX: Record<Category, number> = {
  operational_stability: 40,
  systems_reliability: 30,
  organizational_capacity: 30,
}

export const STATUS_LABELS: Record<Status, string> = {
  healthy: 'Healthy',
  moderate: 'Moderate',
  elevated: 'Elevated',
  critical: 'Critical',
}

export interface SignalInput {
  signal_type: SignalType
  severity: Severity
}

export interface ScoredSignal extends SignalInput {
  name: string
  category: Category
  contribution: number
}

export interface RiskScore {
  score: number
  status: Status
  rawTotal: number
  signals: ScoredSignal[]
  categoryScores: Record<Category, number>
}

export function statusForScore(score: number): Status {
  if (score <= 30) return 'healthy'
  if (score <= 60) return 'moderate'
  if (score <= 80) return 'elevated'
  return 'critical'
}

// Severity contribution, clamped by each signal's maxContribution.
export function contributionFor(
  signal_type: SignalType,
  severity: Severity,
): number {
  const base = SEVERITY_POINTS[severity]
  const cap = SIGNAL_REGISTRY[signal_type].maxContribution
  return Math.min(base, cap)
}

export function calculateOperationalRisk(signals: SignalInput[]): RiskScore {
  const scored: ScoredSignal[] = signals.map((s) => ({
    ...s,
    name: SIGNAL_REGISTRY[s.signal_type].name,
    category: SIGNAL_REGISTRY[s.signal_type].category,
    contribution: contributionFor(s.signal_type, s.severity),
  }))

  const categoryScores: Record<Category, number> = {
    operational_stability: 0,
    systems_reliability: 0,
    organizational_capacity: 0,
  }
  for (const s of scored) {
    categoryScores[s.category] += s.contribution
  }

  const rawTotal =
    categoryScores.operational_stability +
    categoryScores.systems_reliability +
    categoryScores.organizational_capacity

  // Category-weighted normalization to 0-100.
  // Category weights: OS 40%, SR 30%, OC 30%. Each category is normalized
  // against its own max before being weighted. This matches the PRD's
  // "Category Weights" table and keeps a single-severity-on-one-signal
  // from dominating the score.
  const normalized =
    (categoryScores.operational_stability / CATEGORY_MAX.operational_stability) * 40 +
    (categoryScores.systems_reliability / CATEGORY_MAX.systems_reliability) * 30 +
    (categoryScores.organizational_capacity / CATEGORY_MAX.organizational_capacity) * 30

  const score = Math.max(0, Math.min(100, Math.round(normalized)))

  return {
    score,
    status: statusForScore(score),
    rawTotal,
    signals: scored,
    categoryScores,
  }
}
