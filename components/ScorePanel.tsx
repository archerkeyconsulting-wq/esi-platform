import { StatusDot, STATUS_TEXT_CLASS } from './StatusDot'
import { STATUS_LABELS } from '@/lib/scoring/ors-lite'
import type { AssessmentStatus } from '@/lib/db/types'

export function ScorePanel({
  score,
  status,
  signalCount,
  assessedAt,
}: {
  score: number | null
  status: AssessmentStatus | null
  signalCount: number
  assessedAt: string | null
}) {
  return (
    <div>
      <div className="font-mono text-xs uppercase tracking-widest text-muted mb-4">
        Operational Risk Score
      </div>

      <div className="font-mono text-[120px] leading-none text-ink font-medium">
        {score ?? '—'}
      </div>

      <div className="h-px bg-rule my-4 w-32" />

      {status && (
        <div className="flex items-center gap-2 mb-4">
          <StatusDot status={status} />
          <span
            className={`font-mono text-sm uppercase tracking-widest ${STATUS_TEXT_CLASS[status]}`}
          >
            {STATUS_LABELS[status]}
          </span>
        </div>
      )}

      <div className="font-sans text-sm text-muted">
        Derived from {signalCount} signal{signalCount === 1 ? '' : 's'}
      </div>
      {assessedAt && (
        <div className="font-mono text-xs text-muted uppercase tracking-wide mt-1">
          Assessed {new Date(assessedAt).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric',
          })}
        </div>
      )}
    </div>
  )
}
