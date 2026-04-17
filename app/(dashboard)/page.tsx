'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import type { CurrentUser } from '@/lib/auth'

interface DashboardData {
  latestAssessment: {
    id: string
    created_at: string
  } | null
  esiBand: {
    score: number
    riskBand: string
  } | null
  topGap: string | null
}

export default function DashboardPage() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [data, setData] = useState<DashboardData>({
    latestAssessment: null,
    esiBand: null,
    topGap: null,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return

        setUser(currentUser)

        if (!currentUser.org_id) {
          setLoading(false)
          return
        }

        // Fetch latest assessment
        const { data: assessment } = await supabase
          .from('assessments')
          .select('id, created_at')
          .eq('org_id', currentUser.org_id)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (assessment) {
          setData((prev) => ({
            ...prev,
            latestAssessment: assessment,
          }))

          // Fetch risk classification
          const { data: risk } = await supabase
            .from('risk_classifications')
            .select('classification, severity_score')
            .eq('assessment_id', assessment.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (risk) {
            setData((prev) => ({
              ...prev,
              esiBand: {
                score: Math.round(risk.severity_score),
                riskBand: risk.classification,
              },
            }))
          }

          // Fetch domain scores to find lowest
          const { data: scores } = await supabase
            .from('domain_scores')
            .select('domain, score')
            .eq('assessment_id', assessment.id)
            .order('score', { ascending: true })
            .limit(1)
            .single()

          if (scores) {
            setData((prev) => ({
              ...prev,
              topGap: scores.domain,
            }))
          }
        }
      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Executive overview of your execution health</p>
      </div>

      {data.latestAssessment && data.esiBand ? (
        <div className="space-y-8">
          {/* ESI Snapshot Card */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Execution Systems Index</h2>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Large ESI Score */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-brand-yellow to-yellow-300 flex items-center justify-center shadow-lg mb-6">
                  <div className="text-center">
                    <div className="text-6xl font-bold text-slate-900">
                      {data.esiBand.score}
                    </div>
                    <div className="text-slate-700 text-sm font-medium">out of 100</div>
                  </div>
                </div>
                <p className="text-slate-600 text-sm text-center">
                  Last updated:{' '}
                  {new Date(data.latestAssessment.created_at).toLocaleDateString()}
                </p>
              </div>

              {/* Key Insights */}
              <div className="space-y-4">
                <div className="metric-card">
                  <div className="text-sm text-slate-600 mb-2">Status</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {data.esiBand.riskBand === 'stable' && '✅'}
                      {data.esiBand.riskBand === 'emerging_strain' && '⚠️'}
                      {data.esiBand.riskBand === 'structural_friction' && '🔴'}
                      {data.esiBand.riskBand === 'systemic_breakdown' && '🚨'}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 capitalize">
                        {data.esiBand.riskBand.replace(/_/g, ' ')}
                      </div>
                      <p className="text-xs text-slate-600">
                        {data.esiBand.riskBand === 'stable' &&
                          'Execution is performing well'}
                        {data.esiBand.riskBand === 'emerging_strain' &&
                          'Early signs of strain'}
                        {data.esiBand.riskBand === 'structural_friction' &&
                          'Significant gaps detected'}
                        {data.esiBand.riskBand === 'systemic_breakdown' &&
                          'Critical issues found'}
                      </p>
                    </div>
                  </div>
                </div>

                {data.topGap && (
                  <div className="metric-card">
                    <div className="text-sm text-slate-600 mb-2">Biggest Gap</div>
                    <div className="font-bold text-slate-900 capitalize mb-2">
                      {data.topGap.replace(/_/g, ' ')}
                    </div>
                    <p className="text-sm text-slate-600 mb-3">
                      This is your lowest-scoring execution signal. Improving this
                      area could unlock significant value.
                    </p>
                    <Link
                      href="/dashboard/signals"
                      className="text-sm text-brand-yellow font-medium hover:text-yellow-500"
                    >
                      View detailed breakdown →
                    </Link>
                  </div>
                )}

                <div className="metric-card">
                  <div className="text-sm text-slate-600 mb-2">Next Steps</div>
                  <div className="space-y-2">
                    <Link
                      href="/dashboard/waterfall"
                      className="block text-sm text-brand-yellow font-medium hover:text-yellow-500"
                    >
                      💰 See financial impact
                    </Link>
                    <Link
                      href={`/assessment/${data.latestAssessment.id}/operations-map`}
                      className="block text-sm text-brand-yellow font-medium hover:text-yellow-500"
                    >
                      🗺️ View operations map
                    </Link>
                    <Link
                      href="/assessment/new"
                      className="block text-sm text-brand-yellow font-medium hover:text-yellow-500"
                    >
                      📝 Run 90-day check-in
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Info Cards */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="metric-card">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="font-bold text-slate-900 mb-2">Signal Analysis</h3>
              <p className="text-sm text-slate-600 mb-4">
                See how each of your five execution signals are performing
              </p>
              <Link href="/dashboard/signals" className="text-sm text-brand-yellow font-medium">
                View signals →
              </Link>
            </div>

            <div className="metric-card">
              <div className="text-3xl mb-2">💰</div>
              <h3 className="font-bold text-slate-900 mb-2">Financial Impact</h3>
              <p className="text-sm text-slate-600 mb-4">
                Understand the estimated annual cost of your execution gaps
              </p>
              <Link href="/dashboard/waterfall" className="text-sm text-brand-yellow font-medium">
                View impact →
              </Link>
            </div>

            <div className="metric-card">
              <div className="text-3xl mb-2">🗺️</div>
              <h3 className="font-bold text-slate-900 mb-2">Operations Map</h3>
              <p className="text-sm text-slate-600 mb-4">
                Visual representation of your execution workflows and bottlenecks
              </p>
              <Link
                href={`/assessment/${data.latestAssessment.id}/operations-map`}
                className="text-sm text-brand-yellow font-medium"
              >
                View map →
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Assessment Yet</h2>
          <p className="text-slate-600 mb-8">
            Start your first assessment to measure execution and get insights
          </p>
          <Link href="/assessment/new" className="btn-primary">
            Start Assessment
          </Link>
        </div>
      )}
    </div>
  )
}
