'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Question {
  key: string
  text: string
  type: 'likert' | 'text' | 'radio'
  domain: string
  options?: string[]
}

interface Assessment {
  id: string
  status: string
  assessment_versions: {
    schema_json: {
      questions: Question[]
    }
  }
}

export default function AssessmentPage() {
  const params = useParams()
  const router = useRouter()
  const assessmentId = params.id as string

  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadAssessment = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('assessments')
          .select('id, status, assessment_versions(schema_json)')
          .eq('id', assessmentId)
          .single()

        if (fetchError || !data) {
          setError('Assessment not found')
          return
        }

        setAssessment(data as Assessment)

        // Load existing responses
        const { data: existingResponses } = await supabase
          .from('responses')
          .select('question_key, answer')
          .eq('assessment_id', assessmentId)

        if (existingResponses) {
          const responsesMap: Record<string, any> = {}
          existingResponses.forEach((r: any) => {
            responsesMap[r.question_key] = r.answer
          })
          setResponses(responsesMap)
        }
      } catch (err) {
        setError('Failed to load assessment')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadAssessment()
  }, [assessmentId])

  const handleResponseChange = (key: string, value: any) => {
    setResponses((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  const handleSaveResponse = async (key: string, value: any) => {
    try {
      await supabase.from('responses').upsert({
        assessment_id: assessmentId,
        question_key: key,
        answer: value,
      })
    } catch (err) {
      console.error('Failed to save response:', err)
    }
  }

  const handleNext = async () => {
    const currentQuestion = assessment?.assessment_versions.schema_json.questions[currentQuestionIndex]
    if (currentQuestion) {
      await handleSaveResponse(currentQuestion.key, responses[currentQuestion.key])
    }

    if (currentQuestionIndex < (assessment?.assessment_versions.schema_json.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleComplete = async () => {
    setSubmitting(true)
    try {
      // Save last response
      const currentQuestion = assessment?.assessment_versions.schema_json.questions[currentQuestionIndex]
      if (currentQuestion) {
        await handleSaveResponse(currentQuestion.key, responses[currentQuestion.key])
      }

      // Mark assessment as complete
      const { error: updateError } = await supabase
        .from('assessments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', assessmentId)

      if (updateError) {
        setError('Failed to complete assessment')
        return
      }

      // Trigger scoring via API
      const scoreResponse = await fetch(`/api/assessments/${assessmentId}/score`, {
        method: 'POST',
      })

      if (!scoreResponse.ok) {
        setError('Failed to score assessment')
        return
      }

      // Redirect to results
      router.push(`/assessment/${assessmentId}/results`)
    } catch (err) {
      setError('Failed to complete assessment')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-yellow mx-auto mb-4"></div>
          <p className="text-slate-600">Loading assessment...</p>
        </div>
      </div>
    )
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-slate-600 mb-8">{error || 'Assessment not found'}</p>
          <a href="/assessment/new" className="btn-primary">
            Start New Assessment
          </a>
        </div>
      </div>
    )
  }

  const questions = assessment.assessment_versions.schema_json.questions
  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-slate-600">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <span className="text-sm font-medium text-brand-yellow">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-yellow transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Question */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">{currentQuestion.text}</h3>
            <p className="text-sm text-slate-500">Domain: {currentQuestion.domain}</p>
          </div>

          {/* Answer Input */}
          <div className="mb-8">
            {currentQuestion.type === 'likert' && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name={currentQuestion.key}
                      value={value}
                      checked={responses[currentQuestion.key] === value}
                      onChange={(e) => handleResponseChange(currentQuestion.key, Number(e.target.value))}
                      className="mr-3"
                    />
                    <span className="text-slate-700">
                      {value === 1 && 'Strongly Disagree'}
                      {value === 2 && 'Disagree'}
                      {value === 3 && 'Neutral'}
                      {value === 4 && 'Agree'}
                      {value === 5 && 'Strongly Agree'}
                    </span>
                  </label>
                ))}
              </div>
            )}

            {currentQuestion.type === 'text' && (
              <textarea
                value={responses[currentQuestion.key] || ''}
                onChange={(e) => handleResponseChange(currentQuestion.key, e.target.value)}
                placeholder="Enter your response..."
                className="w-full h-32 p-4 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow"
              />
            )}

            {currentQuestion.type === 'radio' && (
              <div className="space-y-3">
                {currentQuestion.options?.map((option) => (
                  <label key={option} className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                    <input
                      type="radio"
                      name={currentQuestion.key}
                      value={option}
                      checked={responses[currentQuestion.key] === option}
                      onChange={(e) => handleResponseChange(currentQuestion.key, e.target.value)}
                      className="mr-3"
                    />
                    <span className="text-slate-700">{option}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-4">
            <button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              className="btn-secondary disabled:opacity-50"
            >
              ← Previous
            </button>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? 'Completing...' : 'Complete Assessment'}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="btn-primary"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
