import clsx from 'clsx'
import {
  CATEGORY_LABELS,
  SIGNAL_REGISTRY,
  type Category,
  type SignalType,
  type Severity,
} from '@/lib/scoring/ors-lite'
import type { AssessmentStatus } from '@/lib/db/types'

const SEVERITY_TO_STATUS: Record<Severity, AssessmentStatus | null> = {
  none: null,
  mild: 'moderate',
  moderate: 'elevated',
  severe: 'critical',
}

const SEVERITY_LABEL: Record<Severity, string> = {
  none: 'NONE',
  mild: 'MILD',
  moderate: 'MODERATE',
  severe: 'SEVERE',
}

const STATUS_BORDER_CLASS: Record<AssessmentStatus, string> = {
  healthy: 'border-l-healthy',
  moderate: 'border-l-moderate',
  elevated: 'border-l-elevated',
  critical: 'border-l-critical',
}

const THRESHOLD_COPY: Record<SignalType, string> = {
  supplier_concentration: 'Top supplier share > 50%',
  demand_fulfillment: 'Backlog growth or OTIF decline',
  quality_drift: 'Scrap/defect rate trending upward',
  erp_instability: 'Error rate or manual override growth',
  throughput_variance: 'Output CoV above baseline',
  knowledge_attrition: 'Retirement-eligible critical roles',
  execution_load: 'Delayed initiatives or excessive span',
}

export function SignalCard({
  signal_type,
  severity,
  contribution,
  evidence,
  raw_value,
}: {
  signal_type: SignalType
  severity: Severity
  contribution: number
  evidence: string | null
  raw_value: string | null
}) {
  const reg = SIGNAL_REGISTRY[signal_type]
  const status = SEVERITY_TO_STATUS[severity]
  const active = severity !== 'none'
  const borderClass =
    status && active ? STATUS_BORDER_CLASS[status] : 'border-l-transparent'

  return (
    <div
      className={clsx(
        'border-l-[3px] px-5 py-4',
        borderClass,
        active ? 'bg-signal-bg' : 'bg-transparent border-b border-b-rule',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-sans font-medium text-sm text-ink">
            {reg.name}
          </div>
          <div className="font-mono text-xs uppercase tracking-widest text-muted mt-0.5">
            {CATEGORY_LABELS[reg.category as Category]}
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <div className="font-mono text-xs uppercase tracking-widest text-muted">
            {SEVERITY_LABEL[severity]}
          </div>
          <div className="font-mono text-sm font-medium text-ink mt-0.5">
            {contribution > 0 ? `+${contribution} pts` : '0 pts'}
          </div>
        </div>
      </div>

      {evidence && (
        <div className="font-sans text-sm text-muted mt-3 leading-relaxed">
          {evidence}
        </div>
      )}

      <div className="font-mono text-xs text-muted italic mt-3">
        Trigger: {THRESHOLD_COPY[signal_type]}
        {raw_value ? ` · Observed: ${raw_value}` : ''}
      </div>
    </div>
  )
}
