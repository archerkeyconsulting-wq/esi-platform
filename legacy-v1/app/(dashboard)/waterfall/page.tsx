'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ImpactData {
  domain: string
  score: number
  estimatedImpact: number
}

export default function WaterfallPage() {
  const [impacts, setImpacts] = useState<ImpactData[]>([])
  const [loading, setLoading] = useState(true)
  const [totalImpact, setTotalImpact] = useState(0)

  useEffect(() => {
    const loadImpacts = async () => {
      try {
        const user = await getCurrentUser()
        if (!user?.org_id) return

        // Fetch latest assessment
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

        // Fetch domain scores
        const { data: scores } = await supabase
          .from('domain_scores')
          .select('domain, score')
          .eq('assessment_id', assessment.id)

        if (scores) {
          // Calculate estimated financial impact
          // Impact = (100 - score) * estimated_value_per_point
          // This is simplified; in production, would use actual company revenue
          const impactData = scores.map((s: any) => {
            const gap = 100 - s.score
            const estimatedImpact = gap * 2500 // $2,500 per point gap
            return {
              domain: s.domain,
              score: s.score,
              estimatedImpact,
            }
          })

          impactData.sort((a, b) => b.estimatedImpact - a.estimatedImpact)
          setImpacts(impactData)

          const total = impactData.reduce((sum: number, item: ImpactData) => sum + item.estimatedImpact, 0)
          setTotalImpact(total)
        }
      } catch (error) {
        console.error('Error loading impacts:', error)
      } finally {
        setLoading(false)
      }
    }

    loadImpacts()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Loading impact data...</p>
        </div>
      </div>
    )
  }

  if (impacts.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Financial Impact</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-slate-600 mb-4">No assessment data available</p>
          <Link href="/assessment/new" className="btn-primary">
            Start Assessment
          </Link>
        </div>
      </div>
    )
  }

  const chartData = impacts.map((impact) => ({
    name: impact.domain.replace(/_/g, ' '),
    impact: impact.estimatedImpact / 1000, // Convert to thousands for readability
  }))

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Execution Waterfall</h1>
        <p className="text-slate-600">Financial impact of your execution gaps</p>
      </div>

      <div className="space-y-8">
        {/* Total Impact Card */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-8">
          <div className="text-center mb-6">
            <p className="text-slate-600 mb-2">Estimated Annual Value at Risk</p>
            <div className="text-5xl font-bold text-red-600 mb-2">
              ${(totalImpact / 1000).toFixed(0)}K
            </div>
            <p className="text-slate-600">
              This is what you can capture by improving execution across all signals
            </p>
          </div>

          <div className="bg-white rounded-lg p-4 mb-6">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis label={{ value: 'Impact ($K)', angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  formatter={(value: any) => `$${value}K`}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar dataKey="impact" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="text-sm text-slate-700">
            💡 Closing the execution gaps in your weakest signals could unlock significant
            value. Start with the highest-impact areas for fastest results.
          </p>
        </div>

        {/* Impact Breakdown */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Impact by Signal</h2>

          <div className="space-y-4">
            {impacts.map((impact, index) => {
              const percentage = (impact.estimatedImpact / totalImpact) * 100
              return (
                <div key={impact.domain} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-slate-900 capitalize mb-1">
                        {impact.domain.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-slate-600">
                        Score: {Math.round(impact.score)}/100
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-600">
                        ${(impact.estimatedImpact / 1000).toFixed(0)}K
                      </div>
                      <div className="text-sm text-slate-600">{percentage.toFixed(0)}% of total</div>
                    </div>
                  </div>

                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>

                  <p className="text-xs text-slate-600 mt-2">
                    Gap of {100 - impact.score} points × $2,500 per point
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="font-bold text-slate-900 mb-4">💡 Recommendations</h3>
          <ul className="space-y-3">
            <li className="text-slate-700">
              <strong>Priority #1:</strong> Focus on {impacts[0].domain.replace(/_/g, ' ')} –
              the biggest financial opportunity (${(impacts[0].estimatedImpact / 1000).toFixed(0)}K)
            </li>
            {impacts.length > 1 && (
              <li className="text-slate-700">
                <strong>Quick Win:</strong> Tackle {impacts[impacts.length - 1].domain.replace(/_/g, ' ')}{' '}
                alongside your priority – often correlated improvements
              </li>
            )}
            <li className="text-slate-700">
              <strong>Timeline:</strong> 30-60 days to close the largest gaps; 90 days for
              material impact
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/dashboard/signals" className="btn-secondary">
            ← Back to Signals
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
