'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getCurrentUser, isPESponsor } from '@/lib/auth'

interface CompanySignals {
  org_id: string
  org_name: string
  esiScore: number
  signals: Record<string, number>
}

export default function PortfolioPage() {
  const router = useRouter()
  const [companies, setCompanies] = useState<CompanySignals[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const user = await getCurrentUser()
        if (!user || !isPESponsor(user)) {
          router.push('/dashboard')
          return
        }

        setAuthorized(true)

        // Fetch all organizations in user's portfolio
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('is_demo', false)

        if (!orgs) {
          setLoading(false)
          return
        }

        // For each organization, fetch latest assessment data
        const portfolioData = await Promise.all(
          orgs.map(async (org) => {
            const { data: assessment } = await supabase
              .from('assessments')
              .select('id')
              .eq('org_id', org.id)
              .eq('status', 'completed')
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            if (!assessment) {
              return null
            }

            // Fetch risk classification for ESI score
            const { data: risk } = await supabase
              .from('risk_classifications')
              .select('severity_score')
              .eq('assessment_id', assessment.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()

            // Fetch all domain scores
            const { data: scores } = await supabase
              .from('domain_scores')
              .select('domain, score')
              .eq('assessment_id', assessment.id)

            const signals: Record<string, number> = {}
            let totalScore = 0

            if (scores) {
              scores.forEach((s: any) => {
                signals[s.domain] = s.score
                totalScore += s.score
              })
            }

            return {
              org_id: org.id,
              org_name: org.name,
              esiScore: risk?.severity_score || totalScore / Math.max(Object.keys(signals).length, 1),
              signals,
            }
          })
        )

        setCompanies(portfolioData.filter(Boolean) as CompanySignals[])
      } catch (error) {
        console.error('Error loading portfolio:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPortfolio()
  }, [router])

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Loading portfolio...</p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  if (companies.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Portfolio Comparison</h1>
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-slate-600 mb-4">No portfolio data available</p>
          <p className="text-sm text-slate-600">Assessments from your portfolio companies will appear here</p>
        </div>
      </div>
    )
  }

  const allSignals = Array.from(
    new Set(companies.flatMap((c) => Object.keys(c.signals)))
  ).sort()

  const getSignalColor = (score: number) => {
    if (score >= 70) return 'bg-status-strong text-white'
    if (score >= 50) return 'bg-status-medium text-white'
    return 'bg-status-weak text-white'
  }

  // Sort companies by ESI score
  const sortedCompanies = [...companies].sort((a, b) => b.esiScore - a.esiScore)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Portfolio Comparison</h1>
        <p className="text-slate-600">Execution health across your portfolio companies</p>
      </div>

      <div className="space-y-8">
        {/* Summary Statistics */}
        <div className="grid md:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="text-sm text-slate-600 mb-1">Portfolio Companies</div>
            <div className="text-3xl font-bold text-brand-yellow">{companies.length}</div>
          </div>
          <div className="metric-card">
            <div className="text-sm text-slate-600 mb-1">Average ESI</div>
            <div className="text-3xl font-bold text-slate-900">
              {Math.round(companies.reduce((sum, c) => sum + c.esiScore, 0) / companies.length)}
            </div>
          </div>
          <div className="metric-card">
            <div className="text-sm text-slate-600 mb-1">Highest Performer</div>
            <div className="text-3xl font-bold text-status-strong">
              {Math.round(sortedCompanies[0].esiScore)}
            </div>
            <div className="text-xs text-slate-600 truncate">{sortedCompanies[0].org_name}</div>
          </div>
          <div className="metric-card">
            <div className="text-sm text-slate-600 mb-1">Needs Attention</div>
            <div className="text-3xl font-bold text-status-weak">
              {Math.round(sortedCompanies[sortedCompanies.length - 1].esiScore)}
            </div>
            <div className="text-xs text-slate-600 truncate">
              {sortedCompanies[sortedCompanies.length - 1].org_name}
            </div>
          </div>
        </div>

        {/* Heatmap */}
        <div className="bg-white rounded-lg shadow-lg p-8 overflow-x-auto">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Execution Heatmap</h2>

          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-3 px-4 font-bold text-slate-900 border-b border-slate-200 w-32">
                  Company
                </th>
                <th className="text-center py-3 px-2 font-bold text-slate-700 border-b border-slate-200 text-xs">
                  ESI
                </th>
                {allSignals.map((signal) => (
                  <th
                    key={signal}
                    className="text-center py-3 px-2 font-bold text-slate-700 border-b border-slate-200 text-xs"
                  >
                    {signal.replace(/_/g, ' ').substring(0, 8)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedCompanies.map((company) => (
                <tr key={company.org_id} className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">{company.org_name}</td>
                  <td className="text-center py-3 px-2">
                    <div className="inline-block font-bold text-lg text-brand-yellow">
                      {Math.round(company.esiScore)}
                    </div>
                  </td>
                  {allSignals.map((signal) => {
                    const score = company.signals[signal]
                    return (
                      <td key={signal} className="text-center py-3 px-2">
                        {score !== undefined ? (
                          <div className={`inline-block w-12 h-12 rounded-lg flex items-center justify-center font-bold ${getSignalColor(score)}`}>
                            {Math.round(score)}
                          </div>
                        ) : (
                          <div className="text-slate-300">—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 flex gap-4 items-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-status-strong"></div>
              <span className="text-sm text-slate-600">Strong (70+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-status-medium"></div>
              <span className="text-sm text-slate-600">Medium (50-69)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-status-weak"></div>
              <span className="text-sm text-slate-600">Weak (&lt;50)</span>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
          <h3 className="font-bold text-slate-900 mb-4">Portfolio Insights</h3>
          <ul className="space-y-3 text-slate-700">
            <li>
              ✓ {sortedCompanies.filter((c) => c.esiScore >= 70).length} companies are executing
              well (ESI 70+)
            </li>
            <li>
              ⚠️ {sortedCompanies.filter((c) => c.esiScore < 50).length} companies need intervention
              (ESI &lt;50)
            </li>
            {allSignals.length > 0 && (
              <li>
                💡 {allSignals[0]} is the most common gap across portfolio (appears in{' '}
                {sortedCompanies.filter((c) => c.signals[allSignals[0]] && c.signals[allSignals[0]] < 70).length} companies below 70)
              </li>
            )}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link href="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
