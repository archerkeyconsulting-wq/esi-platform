import clsx from 'clsx'
import type { AssessmentStatus } from '@/lib/db/types'

const STATUS_CLASS: Record<AssessmentStatus, string> = {
  healthy: 'bg-healthy',
  moderate: 'bg-moderate',
  elevated: 'bg-elevated',
  critical: 'bg-critical',
}

export function StatusDot({
  status,
  className,
}: {
  status: AssessmentStatus | null
  className?: string
}) {
  if (!status) {
    return (
      <span
        className={clsx('status-dot bg-rule', className)}
        aria-label="no assessment"
      />
    )
  }
  return (
    <span
      className={clsx('status-dot', STATUS_CLASS[status], className)}
      aria-label={status}
    />
  )
}

export const STATUS_TEXT_CLASS: Record<AssessmentStatus, string> = {
  healthy: 'text-healthy',
  moderate: 'text-moderate',
  elevated: 'text-elevated',
  critical: 'text-critical',
}
