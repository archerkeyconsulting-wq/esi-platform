'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface ResultsData {
  compositeScore: number
  domainScores: Record<string, number>
  riskBand: string
  confidenceIndex: number
  prescriptions?: any[]
}

export default function AssessmentResultsPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id as string

  const [results, setResults] = useState<ResultsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadResults = async () => {
      try {
        const { data: domainScores, error: domainError } = await supabase
          .from('domain_scores')
          .select('domain, score')
          .eq('assessment_id', assessmentId)

        if (domainError) {
          setError('Failed to load results')
          return
        }

        const { data: riskClass, error: riskError } = await supabase
          .from('risk_classifications')
          .select('classification, severity_score')
          .eq('assessment_id', assessmentId)
          .limit(1)
          .single()

        if (riskError || !riskClass) {
          setError('Failed to load results')
          return
        }

        const domainMap: Record<string, number> = {}
        let totalScore = 0
        domainScores?.forEach((d: any) => {
          domainMap[d.domain] = d.score
          totalScore += d.score
        })

        const avgScore = Object.keys(domainMap).length > 0
          ? totalScore / Object.keys(domainMap).length
          : 0

        setResults({
          compositeScore: riskClass.severity_score || avgScore,
          domainScores: domainMap,
          riskBand: riskClass.classification,
          confidenceIndex: 85, // Would be fetched from domain_scores
          prescriptions: [],
        })
      } catch (err) {
        setError('Failed to load assessment results')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [assessmentId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-slate-600 mb-8">{error || 'Results not available'}</p>
          <button
            onClick={() => router.push('/assessment/new')}
            className="btn-primary"
          >
            Start New Assessment
          </button>
        </div>
      </div>
    )
  }

  const getRiskColor = (riskBand: string) => {
    switch (riskBand) {
      case 'stable':
        return 'bg-green-50 border-green-200'
      case 'emerging_strain':
        return 'bg-yellow-50 border-yellow-200'
      case 'structural_friction':
        return 'bg-orange-50 border-orange-200'
      case 'systemic_breakdown':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-slate-50 border-slate-200'
    }
  }

  const getRiskTextColor = (riskBand: string) => {
    switch (riskBand) {
      case 'stable':
        return 'text-green-700'
      case 'emerging_strain':
        return 'text-yellow-700'
      case 'structural_friction':
        return 'text-orange-700'
      case 'systemic_breakdown':
        return 'text-red-700'
      default:
        return 'text-slate-700'
    }
  }

  const lowestDomain = Object.entries(results.domainScores).sort(([, a], [, b]) => a - b)[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* ESI Score Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-8">Assessment Results</h1>

          <div className="grid md:grid-cols-2 gap-8 mb-8">
            {/* Large Score Display */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-48 h-48 rounded-full bg-gradient-to-br from-brand-yellow to-yellow-300 flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <div className="text-6xl font-bold text-slate-900">
                    {Math.round(results.compositeScore)}
                  </div>
                  <div className="text-slate-600 text-sm">Execution Systems Index</div>
                </div>
              </div>
            </div>

            {/* Risk Band */}
            <div className="flex flex-col justify-center">
              <div className={`${getRiskColor(results.riskBand)} border-2 rounded-lg p-6 mb-6`}>
                <div className={`${getRiskTextColor(results.riskBand)} font-bold text-lg mb-2`}>
                  Risk Status: {results.riskBand.replace(/_/g, ' ').toUpperCase()}
                </div>
                <p className="text-slate-600">
                  {results.riskBand === 'stable' && 'Your execution systems are performing well.'}
                  {results.riskBand === 'emerging_strain' && 'Early signs of execution strain. Monitor closely.'}
                  {results.riskBand === 'structural_friction' && 'Significant execution gaps require attention.'}
                  {results.riskBand === 'systemic_breakdown' && 'Critical execution issues need immediate action.'}
                </p>
              </div>

              <div className="metric-card">
                <div className="text-sm text-slate-600 mb-2">Confidence Index</div>
                <div className="text-2xl font-bold text-brand-yellow">{results.confidenceIndex}%</div>
              </div>
            </div>
          </div>

          {/* Domain Breakdown */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Domain Scores</h2>
            <div className="space-y-4">
              {Object.entries(results.domainScores)
                .sort(([, a], [, b]) => b - a)
                .map(([domain, score]) => {
                  const isLowest = lowestDomain && domain === lowestDomain[0]
                  const percentage = (score / 100) * 100
                  return (
                    <div key={domain}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-slate-900 capitalize">
                          {domain.replace(/_/g, ' ')}
                          {isLowest && ' ⚠️'}
                        </span>
                        <span className="font-bold text-slate-900">{Math.round(score)}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
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

          {/* Actions */}
          <div className="flex gap-4 pt-8 border-t border-slate-200">
            <a href="/dashboard" className="btn-primary">
              View Dashboard
            </a>
            <a href={`/assessment/${assessmentId}/operations-map`} className="btn-secondary">
              View Operations Map
            </a>
            <a href="/assessment/new" className="btn-secondary">
              Start Another Assessment
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
