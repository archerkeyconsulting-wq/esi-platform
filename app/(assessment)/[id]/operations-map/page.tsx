'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface OperationsMapData {
  assessmentId: string
  organizationName: string
  esiScore: number
  domainScores: Record<string, number>
  topGaps: Array<{ domain: string; score: number; gap: number }>
  riskBand: string
}

export default function OperationsMapPage() {
  const params = useParams()
  const assessmentId = params.id as string

  const [data, setData] = useState<OperationsMapData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch assessment and organization
        const { data: assessment, error: assessError } = await supabase
          .from('assessments')
          .select(`
            id,
            organizations(name)
          `)
          .eq('id', assessmentId)
          .single()

        if (assessError || !assessment) {
          setError('Assessment not found')
          return
        }

        // Fetch risk classification
        const { data: risk } = await supabase
          .from('risk_classifications')
          .select('severity_score, classification')
          .eq('assessment_id', assessmentId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // Fetch domain scores
        const { data: scores } = await supabase
          .from('domain_scores')
          .select('domain, score')
          .eq('assessment_id', assessmentId)
          .order('score', { ascending: true })

        if (!scores) {
          setError('Assessment data not found')
          return
        }

        const domainMap: Record<string, number> = {}
        scores.forEach((s: any) => {
          domainMap[s.domain] = s.score
        })

        const topGaps = scores
          .slice(0, 3)
          .map((s: any) => ({
            domain: s.domain,
            score: s.score,
            gap: 100 - s.score,
          }))

        const avgScore = scores.reduce((sum: number, s: any) => sum + s.score, 0) / scores.length

        setData({
          assessmentId,
          organizationName: assessment.organizations?.name || 'Unknown',
          esiScore: risk?.severity_score || avgScore,
          domainScores: domainMap,
          topGaps,
          riskBand: risk?.classification || 'unknown',
        })
      } catch (err) {
        setError('Failed to load operations map data')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [assessmentId])

  const handleExportPDF = async () => {
    setExporting(true)
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/operations-map/pdf`, {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `operations-map-${assessmentId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert('Failed to export PDF')
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Loading operations map...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-slate-600 mb-8">{error}</p>
          <a href="/dashboard" className="btn-primary">
            Back to Dashboard
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{data.organizationName}</h1>
              <p className="text-slate-600">Operations Map & Execution Analysis</p>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="btn-primary disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : '📥 Export PDF'}
            </button>
          </div>

          {/* ESI Score Summary */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-br from-brand-yellow to-yellow-300 rounded-lg p-6 text-center">
              <div className="text-5xl font-bold text-slate-900 mb-2">{Math.round(data.esiScore)}</div>
              <div className="text-slate-700 font-medium">Execution Systems Index</div>
            </div>

            <div className="bg-slate-100 rounded-lg p-6">
              <div className="text-3xl font-bold text-slate-900 mb-2">
                {data.topGaps.length}
              </div>
              <div className="text-slate-700 font-medium">Critical Gaps Identified</div>
            </div>

            <div className="bg-slate-100 rounded-lg p-6">
              <div className="text-3xl font-bold text-slate-900 mb-2">
                {Math.round(Object.values(data.domainScores).reduce((a, b) => a + b, 0) / Object.keys(data.domainScores).length)}
              </div>
              <div className="text-slate-700 font-medium">Average Signal Score</div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded">
            <h2 className="font-bold text-slate-900 mb-2">Executive Summary</h2>
            <p className="text-slate-700 leading-relaxed">
              This organization's execution capability shows{' '}
              {data.esiScore >= 70
                ? 'strong performance across most signals.'
                : data.esiScore >= 50
                  ? 'mixed execution with some areas needing attention.'
                  : 'significant execution gaps that require intervention.'}
              The {data.topGaps[0]?.domain.replace(/_/g, ' ')} signal is the biggest opportunity
              for improvement. Addressing the top 3 gaps could unlock meaningful operational
              value.
            </p>
          </div>
        </div>

        {/* Execution Workflow Diagram */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Execution Workflow</h2>

          <div className="space-y-6">
            {/* Flow Diagram */}
            <div className="bg-slate-50 p-8 rounded-lg border-2 border-slate-200">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <div className="bg-brand-yellow text-slate-900 font-bold py-3 px-4 rounded-lg mb-2">
                    Decisions
                  </div>
                  <div className="text-sm text-slate-600">Strategy becomes action</div>
                </div>

                <div className="text-3xl text-slate-400">→</div>

                <div className="flex-1 text-center">
                  <div className="bg-brand-yellow text-slate-900 font-bold py-3 px-4 rounded-lg mb-2">
                    Accountability
                  </div>
                  <div className="text-sm text-slate-600">Owners assigned & tracked</div>
                </div>

                <div className="text-3xl text-slate-400">→</div>

                <div className="flex-1 text-center">
                  <div className="bg-brand-yellow text-slate-900 font-bold py-3 px-4 rounded-lg mb-2">
                    Execution
                  </div>
                  <div className="text-sm text-slate-600">Work gets done</div>
                </div>

                <div className="text-3xl text-slate-400">→</div>

                <div className="flex-1 text-center">
                  <div className="bg-brand-yellow text-slate-900 font-bold py-3 px-4 rounded-lg mb-2">
                    Outcome
                  </div>
                  <div className="text-sm text-slate-600">Results delivered</div>
                </div>
              </div>
            </div>

            {/* Bottleneck Analysis */}
            <div>
              <h3 className="font-bold text-slate-900 mb-4">Bottleneck Analysis</h3>
              <p className="text-slate-600 mb-4">
                Below are the execution signals with the biggest gaps relative to
                best-in-class performance.
              </p>

              <div className="space-y-3">
                {data.topGaps.map((gap, index) => {
                  const percentage = (gap.score / 100) * 100
                  return (
                    <div key={gap.domain} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="font-bold text-slate-900 capitalize">
                            #{index + 1}: {gap.domain.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-slate-600">
                            Gap: {gap.gap} points | Annual impact: ${gap.gap * 2500 / 1000}K
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600">
                            {Math.round(gap.score)}
                          </div>
                          <div className="text-xs text-slate-600">/100</div>
                        </div>
                      </div>

                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Recommended Actions</h2>

          <div className="space-y-4">
            <div className="border-l-4 border-green-400 bg-green-50 p-4 rounded">
              <h3 className="font-bold text-slate-900 mb-2">🎯 30-Day Priority</h3>
              <p className="text-slate-700">
                Focus on {data.topGaps[0]?.domain.replace(/_/g, ' ')}. Quick wins in ownership
                assignment and decision communication can move this signal 10+ points.
              </p>
            </div>

            <div className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded">
              <h3 className="font-bold text-slate-900 mb-2">📈 60-Day Initiative</h3>
              <p className="text-slate-700">
                Implement process improvements for {data.topGaps[1]?.domain.replace(/_/g, ' ')}.
                Correlate with {data.topGaps[0]?.domain.replace(/_/g, ' ')} improvements—often
                mutually reinforcing.
              </p>
            </div>

            <div className="border-l-4 border-purple-400 bg-purple-50 p-4 rounded">
              <h3 className="font-bold text-slate-900 mb-2">✅ 90-Day Check-In</h3>
              <p className="text-slate-700">
                Measure progress with a repeat assessment. Target: 10-point improvement on
                priority signals. Typically achievable with focused effort.
              </p>
            </div>
          </div>
        </div>

        {/* All Domain Scores */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">All Signal Scores</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(data.domainScores)
              .sort(([, a], [, b]) => b - a)
              .map(([domain, score]) => {
                const percentage = (score / 100) * 100
                const statusColor =
                  score >= 70 ? 'text-status-strong' : score >= 50 ? 'text-status-medium' : 'text-status-weak'

                return (
                  <div key={domain} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="font-bold text-slate-900 capitalize">
                        {domain.replace(/_/g, ' ')}
                      </div>
                      <div className={`text-2xl font-bold ${statusColor}`}>
                        {Math.round(score)}
                      </div>
                    </div>

                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          score >= 70
                            ? 'bg-status-strong'
                            : score >= 50
                              ? 'bg-status-medium'
                              : 'bg-status-weak'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <a href="/dashboard" className="btn-primary">
            Back to Dashboard
          </a>
          <a href="/assessment/new" className="btn-secondary">
            Run Another Assessment
          </a>
        </div>
      </div>
    </div>
  )
}
