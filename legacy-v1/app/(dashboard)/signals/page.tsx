'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

interface SignalData {
  domain: string
  score: number
  benchmark?: number
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalData[]>([])
  const [loading, setLoading] = useState(true)
  const [latestAssessmentId, setLatestAssessmentId] = useState<string | null>(null)

  useEffect(() => {
    const loadSignals = async () => {
      try {
        const user = await getCurrentUser()
        if (!user?.org_id) return

        // Fetch latest completed assessment
        const { data: assessment } = await supabase
          .from('assessments')
          .select('id')
          .eq('org_id', user.org_id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!assessment) {
          setLoading(false)
          return
        }

        setLatestAssessmentId(assessment.id)

        // Fetch domain scores
        const { data: scores } = await supabase
          .from('domain_scores')
          .select('domain, score')
          .eq('assessment_id', assessment.id)

        if (scores) {
          // Sort by weakness (lowest score first)
          const sortedScores = scores.sort((a: any, b: any) => a.score - b.score)
          setSignals(sortedScores)
        }
      } catch (error) {
        console.error('Error loading signals:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSignals()
  }, [])

  const getSignalStatus = (score: number) => {
    if (score >= 70) return { label: 'Strong', color: 'text-status-strong', bg: 'bg-green-50' }
    if (score >= 50) return { label: 'Medium', color: 'text-status-medium', bg: 'bg-yellow-50' }
    return { label: 'Weak', color: 'text-status-weak', bg: 'bg-red-50' }
  }

  const getSignalDescription = (domain: string): string => {
    const descriptions: Record<string, string> = {
      decisions: 'How quickly decisions move from proposal to implementation and how well they are communicated',
      accountability: 'How explicitly owners are assigned and tracked for execution',
      escalation: 'Clear escalation paths and time to resolution for blocked work',
      resource_flow: 'How efficiently resources are requested, approved, and deployed',
      feedback: 'How problems are surfaced and course corrections are made',
    }
    return descriptions[domain] || ''
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Loading signals...</p>
        </div>
      </div>
    )
  }

  if (signals.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Signal Analysis</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-slate-600 mb-4">No assessment data available</p>
          <Link href="/assessment/new" className="btn-primary">
            Start Assessment
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Signal Deep-Dive</h1>
        <p className="text-slate-600">How your five execution signals are performing</p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="space-y-6">
          {signals.map((signal) => {
            const status = getSignalStatus(signal.score)
            const percentage = (signal.score / 100) * 100
            return (
              <div key={signal.domain} className={`${status.bg} border-2 border-opacity-50 rounded-lg p-6`}>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 capitalize mb-1">
                      {signal.domain.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                      {getSignalDescription(signal.domain)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-bold ${status.color}`}>
                      {Math.round(signal.score)}
                    </div>
                    <div className="text-sm text-slate-600">out of 100</div>
                    <div className={`text-sm font-medium ${status.color}`}>
                      {status.label}
                    </div>
                  </div>
                </div>

                {/* Score Bar */}
                <div className="mb-4">
                  <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all ${
                        signal.score >= 70
                          ? 'bg-status-strong'
                          : signal.score >= 50
                            ? 'bg-status-medium'
                            : 'bg-status-weak'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Improvement Tips */}
                <div className="text-sm text-slate-700 bg-white bg-opacity-50 rounded p-3">
                  {signal.score < 70 && (
                    <p>
                      💡 <strong>Improvement opportunity:</strong> This signal is below
                      best-in-class performance. Review similar companies that score 80+
                      for best practices.
                    </p>
                  )}
                  {signal.score >= 70 && (
                    <p>
                      ✅ <strong>Strength:</strong> This signal is performing well. Focus
                      your improvement efforts on lower-scoring signals.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <h3 className="font-bold text-slate-900 mb-4">Summary</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="metric-card">
              <div className="text-sm text-slate-600 mb-1">Strongest Signal</div>
              <div className="font-bold text-slate-900 capitalize">
                {signals[signals.length - 1].domain.replace(/_/g, ' ')}
              </div>
              <div className="text-2xl font-bold text-status-strong">
                {Math.round(signals[signals.length - 1].score)}
              </div>
            </div>
            <div className="metric-card">
              <div className="text-sm text-slate-600 mb-1">Weakest Signal</div>
              <div className="font-bold text-slate-900 capitalize">
                {signals[0].domain.replace(/_/g, ' ')}
              </div>
              <div className="text-2xl font-bold text-status-weak">
                {Math.round(signals[0].score)}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 pt-8 border-t border-slate-200 flex gap-4">
          <Link href="/dashboard/waterfall" className="btn-secondary">
            See Financial Impact
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
