'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewAssessmentPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedType, setSelectedType] = useState<'lite' | 'full'>('full')
  const router = useRouter()

  const handleStartAssessment = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Get user's organization
      const { data: userRecord } = await supabase
        .from('users')
        .select('organization_memberships(org_id)')
        .eq('id', user.id)
        .single()

      const orgId = userRecord?.organization_memberships?.[0]?.org_id

      if (!orgId) {
        setError('You must be part of an organization to start an assessment')
        setLoading(false)
        return
      }

      // Get assessment version
      const { data: assessmentVersion } = await supabase
        .from('assessment_versions')
        .select('id')
        .eq('org_id', orgId)
        .eq('type', selectedType)
        .limit(1)
        .single()

      if (!assessmentVersion) {
        setError(`No ${selectedType} assessment template found for your organization`)
        setLoading(false)
        return
      }

      // Create assessment
      const { data: assessment, error: createError } = await supabase
        .from('assessments')
        .insert({
          org_id: orgId,
          user_id: user.id,
          assessment_version_id: assessmentVersion.id,
          period: new Date().toISOString().split('T')[0],
          status: 'in_progress',
        })
        .select()
        .single()

      if (createError || !assessment) {
        setError('Failed to create assessment')
        setLoading(false)
        return
      }

      router.push(`/assessment/${assessment.id}`)
    } catch (err) {
      setError('An error occurred')
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Start Assessment</h1>
          <p className="text-slate-600 mb-8">
            Select the type of assessment you'd like to conduct
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div
              onClick={() => setSelectedType('full')}
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                selectedType === 'full'
                  ? 'border-brand-yellow bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Full Assessment</h3>
              <p className="text-slate-600 mb-4">
                Comprehensive 50-question assessment covering all execution signals in depth
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✓ 50 detailed questions</li>
                <li>✓ Full domain breakdowns</li>
                <li>✓ Detailed prescriptions</li>
                <li>✓ ~2-3 hours</li>
              </ul>
            </div>

            <div
              onClick={() => setSelectedType('lite')}
              className={`p-6 border-2 rounded-lg cursor-pointer transition-all ${
                selectedType === 'lite'
                  ? 'border-brand-yellow bg-yellow-50'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <h3 className="text-xl font-bold text-slate-900 mb-2">Lite Assessment</h3>
              <p className="text-slate-600 mb-4">
                Quick 15-question assessment for snapshot insights
              </p>
              <ul className="text-sm text-slate-600 space-y-2">
                <li>✓ 15 quick questions</li>
                <li>✓ Risk band classification</li>
                <li>✓ Top recommendation</li>
                <li>✓ ~15 minutes</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleStartAssessment}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Starting...' : `Start ${selectedType === 'full' ? 'Full' : 'Lite'} Assessment`}
            </button>
            <a href="/dashboard" className="btn-secondary">
              Cancel
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
